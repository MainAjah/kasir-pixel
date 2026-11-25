import { describe, expect, it } from 'vite-plus/test';
import { ORIGIN } from '../engine/iso';
import { STORE_SCENE } from '../scenes/store-scene';
import { BASE_H } from '../sprites/room-sprite';
import {
    BLOCK_SHADOW,
    FURNITURE_SHADOW,
    characterShadowSize,
    drawFurnitureShadows,
    floorCorners,
    furnitureShadowOffset,
    furnitureShadowRect,
    shadowStrength,
} from './depth';
import { CANVAS_H, CANVAS_W } from '../engine/iso';

const T = 32;

describe('balok toko melayang (Tahap 5F langkah 1)', () => {
    it('sudut lantai sesuai proyeksi isometrik grid 12 × 9', () => {
        const c = floorCorners(STORE_SCENE);

        expect(c.back).toEqual({ x: ORIGIN.x, y: ORIGIN.y });
        expect(c.right).toEqual({ x: 720, y: 280 });
        expect(c.front).toEqual({ x: 432, y: 424 });
        expect(c.left).toEqual({ x: 48, y: 232 });
    });

    it('alas dan bayangan jatuhnya muat di dalam kanvas', () => {
        const c = floorCorners(STORE_SCENE);
        const lowest =
            c.front.y +
            BASE_H +
            BLOCK_SHADOW.drop +
            ((BLOCK_SHADOW.layers - 1) * BLOCK_SHADOW.spread) / 2;
        const widest = (BLOCK_SHADOW.layers - 1) * BLOCK_SHADOW.spread;

        expect(lowest).toBeLessThanOrEqual(CANVAS_H);
        expect(c.left.x - widest).toBeGreaterThanOrEqual(0);
        expect(c.right.x + widest).toBeLessThanOrEqual(CANVAS_W);
    });
});

describe('bayangan kontak dan oklusi (Tahap 5F langkah 2)', () => {
    it('lebih lemah di malam hari, tetap ada', () => {
        expect(shadowStrength('siang')).toBe(1);
        expect(shadowStrength('senja')).toBeLessThan(1);
        expect(shadowStrength('malam')).toBeLessThan(shadowStrength('senja'));
        expect(shadowStrength('malam')).toBeGreaterThan(0);
    });

    it('bayangan perabot menjauhi jendela: ke arah +gy dan sedikit −gx, makin tinggi makin jauh', () => {
        const low = furnitureShadowOffset(10);
        const high = furnitureShadowOffset(60);

        expect(high.dj).toBeGreaterThan(0);
        expect(high.di).toBeLessThan(0);
        expect(high.dj).toBeGreaterThan(low.dj);
        // Dibatasi: benda sangat tinggi tidak melempar bayangan sejauh-jauhnya.
        expect(furnitureShadowOffset(500)).toEqual(furnitureShadowOffset(64));
    });

    it('tiap perabot punya bayangan yang menutupi jejaknya', () => {
        for (const item of STORE_SCENE.furniture) {
            const r = furnitureShadowRect(item);
            const { di, dj } = furnitureShadowOffset(item.height);
            const m = FURNITURE_SHADOW.margin;

            // Jejak benda (dalam satuan lantai) ada di dalam persegi bayangan sebelum digeser.
            expect(r.x - di).toBeLessThanOrEqual(item.gx * T);
            expect(r.y - dj).toBeLessThanOrEqual(item.gy * T);
            expect(r.w).toBe(item.w * T + 2 * m);
            expect(r.h).toBe(item.h * T + 2 * m);
        }
    });

    it('bayangan perabot dipotong ke bidang lantai, bukan dinding atau sisi balok', () => {
        const calls: string[] = [];
        const ctx = {
            fillStyle: '',
            globalAlpha: 1,
            save: () => calls.push('save'),
            restore: () => calls.push('restore'),
            setTransform: () => calls.push('floor'),
            beginPath: () => undefined,
            rect: (x: number, y: number, w: number, h: number) =>
                calls.push(`clip-rect ${x},${y},${w},${h}`),
            clip: () => calls.push('clip'),
            fillRect: () => calls.push('fill'),
        };

        drawFurnitureShadows(
            ctx as unknown as CanvasRenderingContext2D,
            STORE_SCENE,
        );

        expect(calls.slice(0, 4)).toEqual([
            'save',
            'floor',
            `clip-rect 0,0,${STORE_SCENE.width * T},${STORE_SCENE.height * T}`,
            'clip',
        ]);
        expect(calls.filter((c) => c === 'fill')).toHaveLength(
            STORE_SCENE.furniture.length * FURNITURE_SHADOW.layers,
        );
        expect(calls.at(-1)).toBe('restore');
    });

    it('bayangan karakter berbentuk elips 2:1, lebih lebar dari jejak lama', () => {
        const size = characterShadowSize(12);

        expect(size.w).toBeGreaterThan(24);
        expect(size.h).toBe(Math.round(size.w / 2));
    });
});
