import { describe, expect, it } from 'vite-plus/test';
import { CATCH_UP } from '../actors/customer';
import type { Customer, CustomerState } from '../actors/customer';
import type { DioramaEvent } from './feed';
import { DioramaWorld, MAX_BACKGROUND, MAX_VISIBLE } from './world';

const DT = 1 / 30;

const item = (name = 'Teh') => ({ name, unit: 'kotak', qty: 1 });
const opened: DioramaEvent = { type: 'sale.opened' };
const scanned = (name?: string): DioramaEvent => ({
    type: 'item.scanned',
    item: item(name),
});
const completed = (number: string, total = 10000, lines = 1): DioramaEvent => ({
    type: 'sale.completed',
    number,
    total,
    items: Array.from({ length: lines }, (_, i) => item(`Barang ${i}`)),
});

/** Majukan waktu; catat urutan state tiap pelanggan. */
function run(
    world: DioramaWorld,
    seconds: number,
    trace?: Map<number, CustomerState[]>,
) {
    for (let t = 0; t < seconds; t += DT) {
        world.update(DT);

        if (trace) {
            for (const c of world.customers) {
                const states = trace.get(c.id) ?? [];

                if (states.at(-1) !== c.state) {
                    states.push(c.state);
                }

                trace.set(c.id, states);
            }
        }
    }
}

function runUntil(
    world: DioramaWorld,
    done: () => boolean,
    maxSeconds = 120,
): number {
    let t = 0;

    while (!done() && t < maxSeconds) {
        world.update(DT);
        t += DT;
    }

    return t;
}

const find = (world: DioramaWorld, id: number): Customer | undefined =>
    world.customers.find((c) => c.id === id);

describe('pelanggan dari transaksi nyata', () => {
    it('menjalani urutan state lengkap lalu hilang', () => {
        const world = new DioramaWorld({ seed: 1 });
        const trace = new Map<number, CustomerState[]>();

        world.handle(opened);
        world.handle(scanned());
        world.handle(scanned());

        // Bayar setelah pelanggan selesai belanja (bukan kejar ketinggalan).
        for (
            let t = 0;
            t < 60 && find(world, 1)?.state !== 'ke_antrean';
            t += DT
        ) {
            run(world, DT, trace);
        }

        world.handle(completed('J-1', 23000, 2));
        run(world, 60, trace);

        const states = trace.get(1) ?? [];
        const order: CustomerState[] = [
            'muncul',
            'masuk',
            'ke_rak',
            'ambil',
            'ke_antrean',
            'dilayani',
            'dipindai',
            'bayar',
            'ambil_kantong',
            'keluar',
        ];
        const positions = order.map((s) => states.indexOf(s));

        expect(
            positions.every((p) => p !== -1),
            states.join(' > '),
        ).toBe(true);
        expect([...positions].sort((a, b) => a - b)).toEqual(positions);
        expect(world.customers).toHaveLength(0);
        expect(world.sales.get(1)?.scansPlayed).toBe(2);
    });

    it('menunggu di kasir sampai transaksi dibayar, sambil memindai yang datang', () => {
        const world = new DioramaWorld({ seed: 2 });
        world.handle(opened);
        runUntil(world, () => find(world, 1)?.state === 'dipindai');

        world.handle(scanned());
        run(world, 5);
        expect(find(world, 1)?.state).toBe('dipindai');
        expect(world.sales.get(1)?.scansPlayed).toBe(1);

        world.handle(completed('J-1'));
        runUntil(world, () => find(world, 1)?.state === 'bayar', 10);
        expect(find(world, 1)?.state).toBe('bayar');
        expect(world.display.total).toBe(10000);
    });

    it('kejar ketinggalan: selesai saat masih di jalan, langsung ke kasir dengan kecepatan ×3', () => {
        const world = new DioramaWorld({ seed: 3 });
        world.handle(opened);
        world.handle(scanned());
        runUntil(world, () => find(world, 1)?.state === 'ke_rak');

        world.handle(completed('J-1'));
        const customer = find(world, 1);

        expect(customer?.speed).toBe(CATCH_UP);
        expect(customer?.state).toBe('ke_antrean');
        expect(customer?.pick).toBeNull();

        const trace = new Map<number, CustomerState[]>();
        run(world, 30, trace);
        expect(trace.get(1)).not.toContain('ambil');
        expect(trace.get(1)).toContain('bayar');
    });

    it('penjualan yang datang sudah selesai (misalnya dari polling) masuk dalam mode kejar', () => {
        const world = new DioramaWorld({ seed: 4 });
        world.handle(completed('J-7', 5000, 3));
        world.update(DT);

        expect(world.customers[0].speed).toBe(CATCH_UP);
        expect(world.customers[0].shelvesLeft).toBe(0);
        expect(world.dailyTotal).toBe(5000);
    });

    it('pindai tanpa "dibuka" (diorama dimuat di tengah transaksi) tetap memunculkan pelanggan', () => {
        const world = new DioramaWorld({ seed: 5 });
        world.handle(scanned());
        world.update(DT);

        expect(world.customers).toHaveLength(1);
        expect(world.sales.get(1)?.scansReceived).toBe(1);
    });

    it('transaksi baru sebelum yang lama dibayar: pelanggan lama pergi tanpa kantong', () => {
        const world = new DioramaWorld({ seed: 6 });
        world.handle(opened);
        run(world, 2);
        world.handle(opened);

        const first = find(world, 1);
        expect(first?.state).toBe('keluar');
        expect(world.sales.get(1)?.abandoned).toBe(true);

        runUntil(world, () => find(world, 1) === undefined);
        expect(find(world, 1)).toBeUndefined();
        expect(world.queue.members).not.toContain(1);
    });
});

describe('batas tampil, antrean, dan "+N"', () => {
    it('paling banyak 5 pelanggan tampil; sisanya menjadi angka menunggu', () => {
        const world = new DioramaWorld({ seed: 7 });

        for (let i = 1; i <= 8; i++) {
            world.handle(opened);
            world.handle(scanned());
            world.handle(completed(`J-${i}`));
        }

        let maxVisible = 0;
        let maxQueue = 0;

        for (
            let t = 0;
            t < 120 && (world.visibleCount > 0 || world.waitingCount > 0);
            t += DT
        ) {
            world.update(DT);
            maxVisible = Math.max(maxVisible, world.visibleCount);
            maxQueue = Math.max(maxQueue, world.queue.size);

            if (t < 0.1) {
                expect(world.waitingCount).toBe(7);
            }
        }

        expect(maxVisible).toBe(MAX_VISIBLE);
        expect(maxQueue).toBeLessThanOrEqual(5);
        expect(world.waitingCount).toBe(0);
        expect(world.visibleCount).toBe(0);
        expect(
            [...world.sales.values()].every((s) => s.scansPlayed === 1),
        ).toBe(true);
    });

    it('pelanggan yang menunggu di antrean berdiri di slot berbeda dan maju bergiliran', () => {
        const world = new DioramaWorld({ seed: 8 });

        for (let i = 1; i <= 3; i++) {
            world.handle(opened);
            world.handle(completed(`J-${i}`));
        }

        let checked = false;

        for (let t = 0; t < 60; t += DT) {
            world.update(DT);
            const waiting = world.customers.filter(
                (c) => c.state === 'antre' && c.path.length === 0,
            );

            if (waiting.length >= 2) {
                const tiles = waiting.map((c) => `${c.fx},${c.fy}`);
                expect(new Set(tiles).size).toBe(tiles.length);
                checked = true;
            }

            const served = world.customers.filter((c) =>
                ['dilayani', 'dipindai', 'bayar'].includes(c.state),
            );
            expect(served.length).toBeLessThanOrEqual(1);
        }

        expect(checked).toBe(true);
    });

    it('jalan keluar lewat lajur gy = 8 lalu pintu', () => {
        const world = new DioramaWorld({ seed: 9 });
        world.handle(opened);
        world.handle(completed('J-1'));
        runUntil(world, () => find(world, 1)?.state === 'keluar');

        const path = find(world, 1)?.path ?? [];

        expect(path.at(-1)).toEqual({ gx: -1, gy: 7 });
        expect(path.at(-2)).toEqual({ gx: 0, gy: 7 });
        expect(path.some((t) => t.gy === 8)).toBe(true);
    });
});

describe('pelanggan latar', () => {
    it('paling banyak 2 dan tidak pernah antre atau bayar', () => {
        const world = new DioramaWorld({ seed: 10 });
        const trace = new Map<number, CustomerState[]>();

        expect(world.spawnBackground()).toBe(true);
        expect(world.spawnBackground()).toBe(true);
        expect(world.spawnBackground()).toBe(false);
        expect(world.backgroundCount).toBe(MAX_BACKGROUND);

        run(world, 60, trace);

        for (const states of trace.values()) {
            expect(states).toContain('ambil');
            expect(states).not.toContain('antre');
            expect(states).not.toContain('bayar');
            expect(states.at(-1)).toBe('keluar');
        }
    });

    it('yang muncul bersamaan masuk pintu bergiliran, tidak bertumpuk', () => {
        const world = new DioramaWorld({ seed: 19 });
        world.handle(opened);
        world.update(DT);
        world.spawnBackground();
        run(world, 0.6);

        const [buyer, background] = world.customers;
        expect(buyer.state).not.toBe('muncul');
        expect(background.state).toBe('muncul');
    });

    it('muncul sendiri saat sepi bila latar otomatis menyala', () => {
        const world = new DioramaWorld({ seed: 11, autoBackground: true });
        run(world, 20);

        expect(world.backgroundCount).toBeGreaterThan(0);
        expect(world.backgroundCount).toBeLessThanOrEqual(MAX_BACKGROUND);
        expect(world.buyerCount).toBe(0);
    });

    it('memberi tempat bila toko penuh dan ada pembeli menunggu', () => {
        const world = new DioramaWorld({ seed: 12 });
        world.spawnBackground();
        world.spawnBackground();
        run(world, 0.5);

        for (let i = 1; i <= 5; i++) {
            world.handle(opened);
            world.handle(completed(`J-${i}`));
        }

        let sawFull = false;

        for (let t = 0; t < 90; t += DT) {
            // Penuh, ada pembeli menunggu, dan masih ada latar yang berkeliling:
            // pada pembaruan berikutnya satu pelanggan latar harus mulai keluar.
            const full =
                world.visibleCount === MAX_VISIBLE &&
                world.waitingCount > 0 &&
                world.customers.some(
                    (c) => c.kind === 'latar' && c.state !== 'keluar',
                );
            const leavingBefore = world.customers.filter(
                (c) => c.kind === 'latar' && c.state === 'keluar',
            ).length;

            world.update(DT);
            expect(world.visibleCount).toBeLessThanOrEqual(MAX_VISIBLE);

            if (full) {
                sawFull = true;
                const leavingAfter = world.customers.filter(
                    (c) => c.kind === 'latar' && c.state === 'keluar',
                ).length;
                expect(leavingAfter).toBeGreaterThan(leavingBefore);
            }
        }

        expect(sawFull).toBe(true);
        expect(world.waitingCount).toBe(0);
        expect(
            [...world.sales.values()].every((s) => s.customerId !== null),
        ).toBe(true);
    });
});

describe('pembatalan', () => {
    it('total harian turun dan penjaga menggeleng', () => {
        const world = new DioramaWorld({ seed: 13, dailyTotal: 50000 });
        world.handle(opened);
        world.handle(completed('J-1', 20000));
        expect(world.dailyTotal).toBe(70000);

        world.handle({ type: 'sale.voided', number: 'J-1', total: 20000 });
        world.update(DT);

        expect(world.dailyTotal).toBe(50000);
        expect(world.cashier.state).toBe('batal');
    });

    it('pelanggan yang belum membayar pergi tanpa kantong', () => {
        const world = new DioramaWorld({ seed: 14 });
        world.handle(opened);
        world.handle(completed('J-1'));
        run(world, 1);
        world.handle({ type: 'sale.voided', number: 'J-1', total: 10000 });

        expect(find(world, 1)?.state).toBe('keluar');
        expect(find(world, 1)?.hasBag).toBe(false);
    });

    it('pembatalan penjualan lama yang sudah tidak tampil hanya menurunkan total', () => {
        const world = new DioramaWorld({ seed: 15, dailyTotal: 30000 });
        world.handle({ type: 'sale.voided', number: 'J-lama', total: 10000 });

        expect(world.dailyTotal).toBe(20000);
        expect(world.customers).toHaveLength(0);
    });

    it('total harian tidak pernah minus', () => {
        const world = new DioramaWorld({ seed: 16 });
        world.handle({ type: 'sale.voided', number: 'J-x', total: 10000 });

        expect(world.dailyTotal).toBe(0);
    });
});

describe('aturan tempat', () => {
    it('dua pelanggan tidak pernah berhenti di titik ambil yang sama', () => {
        const world = new DioramaWorld({ seed: 17 });
        world.spawnBackground();
        world.spawnBackground();

        for (let i = 1; i <= 3; i++) {
            world.handle(opened);
            world.handle(scanned());
        }

        for (let t = 0; t < 40; t += DT) {
            world.update(DT);
            const picking = world.customers.filter((c) => c.state === 'ambil');
            const tiles = picking.map((c) => `${c.fx},${c.fy}`);
            expect(new Set(tiles).size).toBe(tiles.length);
        }
    });

    it('pelanggan tidak pernah berdiri di tile terlarang', () => {
        const world = new DioramaWorld({ seed: 18, autoBackground: true });

        for (let i = 1; i <= 6; i++) {
            world.handle(opened);
            world.handle(scanned());
            world.handle(completed(`J-${i}`));
        }

        for (let t = 0; t < 90; t += DT) {
            world.update(DT);

            for (const c of world.customers) {
                if (
                    Number.isInteger(c.fx) &&
                    Number.isInteger(c.fy) &&
                    c.fx >= 0
                ) {
                    expect(world.grid.blocked.has(`${c.fx},${c.fy}`)).toBe(
                        false,
                    );
                }
            }
        }
    });
});
