import { describe, expect, it } from 'vite-plus/test';
import { customerInfo } from '../render/customer-info';
import { tileCenter } from './iso';
import { HIT_BOX, customerAt, customerHead } from './pick';
import { soundCues } from './sound-cues';
import type { SoundSnapshot } from './sound-cues';
import { DioramaWorld } from './world';

const DT = 1 / 30;

function run(world: DioramaWorld, seconds: number) {
    for (let t = 0; t < seconds; t += DT) {
        world.update(DT);
    }
}

const snap = (over: Partial<SoundSnapshot> = {}): SoundSnapshot => ({
    cashierState: 'diam',
    cashierTime: 1,
    customers: [],
    ...over,
});

describe('bunyi (5D-2)', () => {
    it('tidak berbunyi di bingkai pertama', () => {
        expect(soundCues(null, snap({ cashierState: 'pindai' }))).toEqual([]);
    });

    it('bip tiap pindaian, termasuk pindaian berturut-turut', () => {
        expect(
            soundCues(snap(), snap({ cashierState: 'pindai', cashierTime: 0 })),
        ).toEqual(['bip']);
        // Langkah pindai baru: waktu keadaan kembali ke nol.
        expect(
            soundCues(
                snap({ cashierState: 'pindai', cashierTime: 0.4 }),
                snap({ cashierState: 'pindai', cashierTime: 0.01 }),
            ),
        ).toEqual(['bip']);
        // Masih langkah yang sama: tidak berbunyi lagi.
        expect(
            soundCues(
                snap({ cashierState: 'pindai', cashierTime: 0.1 }),
                snap({ cashierState: 'pindai', cashierTime: 0.2 }),
            ),
        ).toEqual([]);
    });

    it('koin, batal, kejar, dan lonceng pintu saat pelanggan baru muncul', () => {
        expect(
            soundCues(
                snap(),
                snap({ cashierState: 'terima_koin', cashierTime: 0 }),
            ),
        ).toEqual(['koin']);
        expect(
            soundCues(snap(), snap({ cashierState: 'batal', cashierTime: 0 })),
        ).toEqual(['batal']);
        expect(
            soundCues(
                snap(),
                snap({ cashierState: 'mengejar', cashierTime: 0 }),
            ),
        ).toEqual(['kejar']);
        expect(
            soundCues(snap({ customers: [1] }), snap({ customers: [1, 2] })),
        ).toEqual(['pintu']);
        expect(
            soundCues(snap({ customers: [1, 2] }), snap({ customers: [2] })),
        ).toEqual([]);
    });

    it('berbunyi mengikuti dunia sungguhan: satu pesanan memberi lonceng, bip, dan koin', () => {
        const world = new DioramaWorld({ seed: 2 });
        world.handle({
            type: 'sale.completed',
            number: 'INV-1',
            total: 6000,
            items: [{ name: 'Teh', unit: 'kotak', qty: 2 }],
        });
        // Keadaan sebelum bingkai pertama: toko masih kosong.
        let prev: SoundSnapshot | null = snap();
        const heard = new Set<string>();

        for (let t = 0; t < 60; t += DT) {
            world.update(DT);
            const next: SoundSnapshot = {
                cashierState: world.cashier.state,
                cashierTime: world.cashier.stateTime,
                customers: world.customers.map((c) => c.id),
            };
            soundCues(prev, next).forEach((c) => heard.add(c));
            prev = next;
        }

        expect([...heard]).toEqual(
            expect.arrayContaining(['pintu', 'bip', 'koin']),
        );
    });
});

describe('klik pelanggan (5D-2)', () => {
    it('memilih pelanggan di titik klik, yang paling depan bila bertumpuk', () => {
        const world = new DioramaWorld({ seed: 6 });
        world.stagePretend('rombongan', 3);
        run(world, 6);
        const [first] = world.customers;
        const foot = tileCenter(first.fx, first.fy);

        expect(
            customerAt(world.customers, { x: foot.x, y: foot.y - 20 }),
        ).not.toBeNull();
        expect(
            customerAt(world.customers, {
                x: foot.x + HIT_BOX.right + 30,
                y: foot.y + 40,
            }),
        ).not.toBe(first);
        expect(customerHead(first).y).toBeLessThan(foot.y);
    });

    it('tidak ada pelanggan di tempat kosong', () => {
        const world = new DioramaWorld({ seed: 1 });

        expect(customerAt(world.customers, { x: 10, y: 10 })).toBeNull();
    });

    it('kartu pembeli sungguhan: nomor, barang, total', () => {
        const world = new DioramaWorld({ seed: 3 });
        world.handle({
            type: 'sale.completed',
            number: 'INV-20261122-0002',
            total: 11500,
            items: [
                { name: 'Keripik singkong', unit: 'bungkus', qty: 1 },
                { name: 'Permen mint', unit: 'bungkus', qty: 3 },
            ],
        });
        run(world, 2);
        const info = customerInfo(world, world.customers[0]);

        expect(info.number).toBe('INV-20261122-0002');
        expect(info.items).toEqual([
            '1 bungkus Keripik singkong',
            '3 bungkus Permen mint',
        ]);
        expect(info.total).toBe('Rp 11.500');
        expect(info.note).toBeNull();
    });

    it('kartu pembeli pura-pura ditandai bukan transaksi nyata, latar hanya melihat-lihat', () => {
        const world = new DioramaWorld({ seed: 5 });
        world.spawnBackground();
        world.stagePretend('pembeli');
        run(world, 3);

        const notes = world.customers.map((c) => customerInfo(world, c).note);

        expect(notes).toEqual(
            expect.arrayContaining([
                'Pengunjung dari peristiwa acak (bukan transaksi nyata).',
                'Hanya melihat-lihat.',
            ]),
        );
        expect(
            world.customers.every((c) => customerInfo(world, c).total === null),
        ).toBe(true);
    });
});
