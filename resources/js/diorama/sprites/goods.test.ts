import { describe, expect, it } from 'vite-plus/test';
import { IDLE_COUNTER, drawCounterSlice } from './counter-sprite';
import {
    BAG_SIZE,
    COIN_FRAMES,
    PRODUCT_COLORS,
    arcPoint,
    bagMatrix,
    coinMatrix,
    drawItemBox,
    handOffset,
    productColor,
} from './goods-sprite';
import { isPaletteColor } from './palette';
import { colorsOf, mirror } from './pixels';

function paint(draw: (ctx: CanvasRenderingContext2D) => void) {
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
    draw(ctx as unknown as CanvasRenderingContext2D);

    return pixels;
}

describe('barang sesuai produk', () => {
    it('produk yang sama selalu berwarna sama, tanpa peduli huruf besar dan spasi', () => {
        expect(productColor('Teh celup')).toEqual(productColor('  teh CELUP '));
        expect(PRODUCT_COLORS).toContainEqual(productColor('Beras 5 kg'));
    });

    it('produk berbeda memakai beberapa warna', () => {
        const names = [
            'Beras 5 kg',
            'Minyak goreng 1 L',
            'Gula pasir 1 kg',
            'Teh celup',
            'Air mineral 600 ml',
            'Mi instan',
            'Kecap manis',
            'Sabun mandi',
        ];
        const colors = new Set(names.map((n) => productColor(n).join()));

        expect(colors.size).toBeGreaterThanOrEqual(6);
    });

    it('kotak barang memakai warna produknya dan hanya palet 24', () => {
        const color = productColor('Mi instan');
        const used = new Set(
            paint((ctx) => drawItemBox(ctx, 20, 20, color)).values(),
        );

        expect(used.has(color[0])).toBe(true);
        expect([...used].every(isPaletteColor)).toBe(true);
    });

    it('barang di scanner berwarna sesuai produk', () => {
        const color = productColor('Beras 5 kg');
        const used = new Set(
            paint((ctx) =>
                drawCounterSlice(ctx, 40, 40, 'kiri', {
                    ...IDLE_COUNTER,
                    scan: 0.3,
                    scanColors: color,
                }),
            ).values(),
        );

        expect(used.has(color[0])).toBe(true);
    });
});

describe('kantong dan koin', () => {
    it('kantong kertas 9 × 11, hanya palet 24', () => {
        const bag = bagMatrix();

        expect([bag.width, bag.height]).toEqual([
            BAG_SIZE.width,
            BAG_SIZE.height,
        ]);
        expect([...colorsOf(bag)].every(isPaletteColor)).toBe(true);
    });

    it('koin berputar 4 bingkai: muka, miring, tepi, miring (cermin)', () => {
        const frames = Array.from({ length: COIN_FRAMES }, (_, f) =>
            coinMatrix(f),
        );

        expect(frames.map((m) => m.width)).toEqual([5, 4, 2, 4]);
        expect(frames[3].pixels).toEqual(mirror(frames[1]).pixels);
        expect(
            frames.every((m) => [...colorsOf(m)].every(isPaletteColor)),
        ).toBe(true);
        expect(coinMatrix(COIN_FRAMES).pixels).toEqual(frames[0].pixels);
    });
});

describe('lintasan dan tangan', () => {
    it('lintasan melengkung: mulai dan berakhir tepat, melambung di tengah', () => {
        const from = { x: 0, y: 50 };
        const to = { x: 40, y: 50 };

        expect(arcPoint(from, to, 0, 10)).toEqual(from);
        expect(arcPoint(from, to, 1, 10)).toEqual(to);
        expect(arcPoint(from, to, 0.5, 10)).toEqual({ x: 20, y: 40 });
        expect(arcPoint(from, to, 2, 10)).toEqual(to);
    });

    it('tangan ke arah hadap, setinggi pinggang', () => {
        expect(handOffset(null, true)).toEqual({ x: -9, y: -19 });
        expect(handOffset(null, false)).toEqual({ x: 9, y: -19 });

        const big = handOffset({ width: 40, height: 50 }, false);
        expect(big.x).toBe(14);
        expect(big.y).toBe(-21);
    });
});
