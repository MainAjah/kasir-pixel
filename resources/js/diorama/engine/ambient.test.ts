import { describe, expect, it } from 'vite-plus/test';
import type { CustomerState } from '../actors/customer';
import type { DioramaEvent } from './feed';
import { DioramaWorld, MAX_VISIBLE } from './world';

const DT = 1 / 30;

function run(
    world: DioramaWorld,
    seconds: number,
    each?: (world: DioramaWorld) => void,
): void {
    for (let t = 0; t < seconds; t += DT) {
        world.update(DT);
        each?.(world);
    }
}

const statesOf = (world: DioramaWorld) =>
    new Set(world.customers.map((c) => c.state));

describe('peristiwa acak pura-pura (Beranda)', () => {
    it('pembeli pura-pura belanja, dipindai, membayar, lalu keluar membawa kantong', () => {
        const world = new DioramaWorld({ seed: 3, dailyTotal: 13000 });
        world.stagePretend('pembeli');
        const seen = new Set<CustomerState>();
        let bag = false;

        run(world, 90, (w) => {
            for (const c of w.customers) {
                seen.add(c.state);
                bag ||= c.hasBag;
            }
        });

        expect([...seen]).toEqual(
            expect.arrayContaining(['ambil', 'dipindai', 'bayar']),
        );
        expect(seen.has('kabur')).toBe(false);
        expect(bag).toBe(true);
        expect(world.customers).toHaveLength(0);
    });

    it('tidak mengubah total harian dan layar pelanggan tetap menampilkan total nyata', () => {
        const world = new DioramaWorld({ seed: 5, dailyTotal: 13000 });
        world.stagePretend('rombongan', 4);

        run(world, 120, (w) => {
            expect(w.display.total).toBeNull();
        });

        expect(world.dailyTotal).toBe(13000);
    });

    it('kabur: lari setelah pindaian pertama dan penjaga mengejar', () => {
        const world = new DioramaWorld({ seed: 7 });
        world.stagePretend('kabur');
        let ran = false;
        let chased = false;

        run(world, 90, (w) => {
            ran ||= statesOf(w).has('kabur');
            chased ||= w.cashier.state === 'mengejar';
        });

        expect(ran).toBe(true);
        expect(chased).toBe(true);
        expect(world.customers).toHaveLength(0);
        // Penjaga kembali ke tempatnya.
        expect(world.cashier.atPost).toBe(true);
    });

    it('rombongan 3 sampai 5 pembeli datang hampir bersamaan, tanpa angka "+N"', () => {
        const world = new DioramaWorld({ seed: 11 });
        const size = world.stagePretend('rombongan');

        expect(size).toBeGreaterThanOrEqual(3);
        expect(size).toBeLessThanOrEqual(5);
        expect(world.waitingCount).toBe(0);

        run(world, size * 1.2);

        expect(world.customers.length).toBe(size);
    });

    it('rombongan dibatasi tempat yang tersisa', () => {
        const world = new DioramaWorld({ seed: 2 });
        world.stagePretend('rombongan', 3);
        run(world, 4);

        expect(world.stagePretend('rombongan', 5)).toBe(MAX_VISIBLE - 3);
    });

    it('penjualan sungguhan mendahului pembeli pura-pura yang belum masuk dan dihitung di "+N"', () => {
        const world = new DioramaWorld({ seed: 4 });
        world.stagePretend('rombongan', 5);
        const real: DioramaEvent = {
            type: 'sale.completed',
            number: 'INV-1',
            total: 5000,
            items: [{ name: 'Teh', unit: 'kotak', qty: 1 }],
        };
        world.handle(real);

        // Yang pertama masuk adalah pembeli sungguhan.
        run(world, 0.1);
        const first = world.customers[0];

        expect(world.saleOf(first)?.number).toBe('INV-1');
        expect(world.dailyTotal).toBe(5000);
    });

    it('penjualan sungguhan tidak terikat ke pembeli pura-pura', () => {
        const world = new DioramaWorld({ seed: 8 });
        world.stagePretend('kabur');
        run(world, 3);
        world.handle({ type: 'sale.opened' });
        world.handle({
            type: 'sale.completed',
            number: 'INV-2',
            total: 7000,
            items: [{ name: 'Gula', unit: 'pak', qty: 1 }],
        });
        run(world, 2);

        const sales = world.customers.map((c) => world.saleOf(c));

        expect(sales.filter((s) => s?.number === 'INV-2')).toHaveLength(1);
        expect(sales.find((s) => s?.pretend)?.number ?? null).toBeNull();
    });

    it('muncul sendiri hanya bila peristiwa acak menyala dan toko sepi', () => {
        const off = new DioramaWorld({ seed: 1 });
        run(off, 60);
        expect(off.customers).toHaveLength(0);

        const on = new DioramaWorld({ seed: 1, ambient: true });
        let pretend = 0;
        run(on, 60, (w) => {
            pretend = Math.max(
                pretend,
                w.customers.filter((c) => w.saleOf(c)?.pretend).length,
            );
        });

        expect(pretend).toBeGreaterThan(0);
    });

    it('tidak memulai peristiwa acak saat ada pembeli sungguhan', () => {
        const world = new DioramaWorld({ seed: 6, ambient: true });
        world.handle({ type: 'sale.opened' });

        // Transaksi nyata dibiarkan terbuka: pembeli menunggu di kasir.
        run(world, 40);

        expect(
            world.customers.filter((c) => world.saleOf(c)?.pretend),
        ).toHaveLength(0);
    });
});
