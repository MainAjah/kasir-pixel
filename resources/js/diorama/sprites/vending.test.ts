import { describe, expect, it } from 'vite-plus/test';
import { C, isPaletteColor } from './palette';
import { RACK_FILLS } from './rack-sprite';
import type { RackFill } from './rack-sprite';
import {
    VENDING_BLINK,
    bottlesPerRow,
    drawVending,
    vendingLightOn,
} from './vending-sprite';
import type { VendingColor } from './vending-sprite';

function paint(color: VendingColor, fill: RackFill, on: boolean) {
    const pixels = new Map<string, string>();
    const ctx = {
        fillStyle: '#000000',
        fillRect(x: number, y: number, w: number, h: number) {
            for (let yy = y; yy < y + h; yy++) {
                for (let xx = x; xx < x + w; xx++) {
                    pixels.set(`${xx},${yy}`, String(this.fillStyle));
                }
            }
        },
    };
    drawVending(
        ctx as unknown as CanvasRenderingContext2D,
        30,
        80,
        color,
        fill,
        on,
    );

    return pixels;
}

const count = (pixels: Map<string, string>, color: string) =>
    [...pixels.values()].filter((c) => c === color).length;

const diff = (a: Map<string, string>, b: Map<string, string>) =>
    [...a.entries()].filter(([at, c]) => b.get(at) !== c).length;

describe('vending machine', () => {
    it('semua warna, isi, dan keadaan lampu hanya memakai palet 24 warna', () => {
        const used = new Set<string>();

        for (const color of [0, 1, 2] as VendingColor[]) {
            for (const fill of RACK_FILLS) {
                for (const on of [true, false]) {
                    paint(color, fill, on).forEach((c) => used.add(c));
                }
            }
        }

        expect([...used].filter((c) => !isPaletteColor(c))).toEqual([]);
    });

    it('botol empat tingkat: 0, 1, 3, 5 per baris; makin penuh makin banyak yang tergambar', () => {
        expect(RACK_FILLS.map(bottlesPerRow)).toEqual([0, 1, 3, 5]);

        const empty = paint(0, 'kosong', true);
        const changed = RACK_FILLS.map((fill) =>
            diff(paint(0, fill, true), empty),
        );

        expect(changed[0]).toBe(0);
        expect(changed[1]).toBeGreaterThan(changed[0]);
        expect(changed[2]).toBeGreaterThan(changed[1]);
        expect(changed[3]).toBeGreaterThan(changed[2]);
    });

    it('lampu menyala: papan nama dan lampu kaca kuning lampu; redup: krem', () => {
        const on = paint(1, 'penuh', true);
        const off = paint(1, 'penuh', false);

        expect(count(on, C(11))).toBeGreaterThan(count(off, C(11)) + 100);
        expect(count(off, C(4))).toBeGreaterThan(count(on, C(4)));
    });

    it('lampu berkedip pelan, dengan fase berbeda tiap mesin', () => {
        expect(vendingLightOn(0, 0)).toBe(true);
        expect(vendingLightOn(VENDING_BLINK + 0.01, 0)).toBe(false);
        expect(vendingLightOn(2 * VENDING_BLINK + 0.01, 0)).toBe(true);
        expect(VENDING_BLINK).toBeGreaterThanOrEqual(1);

        const together = Array.from({ length: 60 }, (_, k) => k * 0.1).every(
            (t) => {
                const states = ([0, 1, 2] as VendingColor[]).map((c) =>
                    vendingLightOn(t, c),
                );

                return states.every((s) => s === states[0]);
            },
        );
        expect(together).toBe(false);
    });
});
