import { describe, expect, it } from 'vite-plus/test';
import { MAX_STEP, createFrameClock } from './loop';

describe('jam bingkai 30 FPS', () => {
    it('layar 60 Hz menggambar tiap bingkai kedua', () => {
        const clock = createFrameClock(30);
        const frameMs = 1000 / 60;
        let steps = 0;

        for (let i = 0; i <= 60; i++) {
            if (clock.tick(i * frameMs) !== null) {
                steps++;
            }
        }

        // Bingkai pertama (dt 0) ditambah 30 langkah dalam satu detik.
        expect(steps).toBe(31);
    });

    it('dt dalam detik dan dibatasi agar aktor tidak melompat setelah jeda', () => {
        const clock = createFrameClock(30);
        clock.tick(0);

        expect(clock.tick(40)).toBeCloseTo(0.04);
        expect(clock.tick(5040)).toBe(MAX_STEP);
    });

    it('reset: waktu tab tersembunyi tidak dihitung', () => {
        const clock = createFrameClock(30);
        clock.tick(0);
        clock.reset();

        expect(clock.tick(60000)).toBe(0);
        expect(clock.tick(60034)).toBeCloseTo(0.034);
    });
});
