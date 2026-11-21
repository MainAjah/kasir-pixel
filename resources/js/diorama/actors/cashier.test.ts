import { describe, expect, it } from 'vite-plus/test';
import { CASHIER_DURATION, CASHIER_MAX_STEPS, Cashier } from './cashier';

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

    it('antrean aksi dibatasi agar animasi tidak tertinggal', () => {
        const cashier = new Cashier();

        for (let i = 0; i < 20; i++) {
            cashier.scan();
        }

        expect(cashier.pending).toBeLessThanOrEqual(CASHIER_MAX_STEPS);
    });
});
