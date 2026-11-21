import { describe, expect, it } from 'vite-plus/test';
import {
    CASHIER_DURATION,
    CASHIER_MAX_STEPS,
    CHASE_SPEED,
    Cashier,
    DOOR_PAUSE,
    RETURN_SPEED,
} from './cashier';

const run = (cashier: Cashier, seconds: number, dt = 1 / 30) => {
    const states: string[] = [];

    for (let t = 0; t < seconds; t += dt) {
        cashier.update(dt);

        if (states.at(-1) !== cashier.state) {
            states.push(cashier.state);
        }
    }

    return states;
};

describe('penjaga kasir', () => {
    it('diam secara bawaan', () => {
        const cashier = new Cashier();
        cashier.update(1);

        expect(cashier.state).toBe('diam');
    });

    it('menyapa, pindai, bungkus, terima koin, lalu kembali diam', () => {
        const cashier = new Cashier();
        cashier.greet();
        cashier.scan();
        cashier.receiveCoin();

        expect(run(cashier, 4)).toEqual([
            'menyapa',
            'pindai',
            'bungkus',
            'terima_koin',
            'diam',
        ]);
    });

    it('pindai lebih cepat saat kejar ketinggalan', () => {
        const normal = new Cashier();
        normal.scan(1);
        const fast = new Cashier();
        fast.scan(3);
        const total = CASHIER_DURATION.pindai + CASHIER_DURATION.bungkus;

        run(normal, total / 3 + 0.05);
        run(fast, total / 3 + 0.05);

        expect(normal.state).not.toBe('diam');
        expect(fast.state).toBe('diam');
    });

    it('batal diputar langsung setelah aksi yang sedang berjalan', () => {
        const cashier = new Cashier();
        cashier.scan();
        cashier.scan();
        cashier.update(0.01);
        cashier.cancel();

        expect(run(cashier, 0.6)).toEqual(['pindai', 'batal']);
    });

    it('mengejar sampai pintu, berhenti, lalu pulang ke tempat dan arah semula', () => {
        const cashier = new Cashier({ gx: 2, gy: 0, facing: 'sw' });
        const toDoor = [
            { gx: 1, gy: 0 },
            { gx: 0, gy: 0 },
        ];
        const back = [
            { gx: 1, gy: 0 },
            { gx: 2, gy: 0 },
        ];

        expect(cashier.chase(toDoor, back)).toBe(true);
        expect(cashier.atPost).toBe(false);
        expect(
            run(cashier, 2 / CHASE_SPEED + DOOR_PAUSE + 2 / RETURN_SPEED + 0.5),
        ).toEqual(['mengejar', 'di_pintu', 'kembali', 'diam']);
        expect([cashier.fx, cashier.fy, cashier.facing]).toEqual([2, 0, 'sw']);
        expect(cashier.atPost).toBe(true);
    });

    it('meja ditinggal: aksi yang belum diputar dibuang, kejaran kedua diabaikan', () => {
        const cashier = new Cashier();
        cashier.scan();
        cashier.receiveCoin();

        expect(cashier.chase([{ gx: 8, gy: 5 }], [{ gx: 9, gy: 5 }])).toBe(
            true,
        );
        expect(cashier.pending).toBe(0);
        expect(cashier.chase([{ gx: 8, gy: 5 }], [{ gx: 9, gy: 5 }])).toBe(
            false,
        );
    });

    it('antrean aksi dibatasi agar animasi tidak tertinggal', () => {
        const cashier = new Cashier();

        for (let i = 0; i < 20; i++) {
            cashier.scan();
        }

        expect(cashier.pending).toBeLessThanOrEqual(CASHIER_MAX_STEPS);
    });
});
