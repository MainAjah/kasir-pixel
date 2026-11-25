import { describe, expect, it } from 'vite-plus/test';
import { WALL_H } from '../engine/iso';
import { DioramaWorld } from '../engine/world';
import { STORE_SCENE } from '../scenes/store-scene';
import { GLOW_H, GLOW_W, PlaceholderRenderer } from './placeholder-renderer';
import {
    LAMP_POOL,
    SUN,
    convexHull,
    drawLampPools,
    drawSunlight,
    lampPoolCenters,
    sunPatch,
    windowSpan,
} from './sunlight';

const T = 32;
const A = STORE_SCENE.width * T;
const B = STORE_SCENE.height * T;

/** Tile lantai yang tertutup perabot. */
function occupied(gx: number, gy: number): boolean {
    return STORE_SCENE.furniture.some(
        (f) => gx >= f.gx && gx < f.gx + f.w && gy >= f.gy && gy < f.gy + f.h,
    );
}

/** Konteks palsu: menghitung isian (fill dan fillRect). */
function counter() {
    let fills = 0;
    const gradient = { addColorStop: () => undefined };
    const ctx = {
        globalCompositeOperation: 'source-over',
        fillStyle: '',
        save: () => undefined,
        restore: () => undefined,
        setTransform: () => undefined,
        beginPath: () => undefined,
        closePath: () => undefined,
        moveTo: () => undefined,
        lineTo: () => undefined,
        rect: () => undefined,
        clip: () => undefined,
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        fill: () => fills++,
        fillRect: () => fills++,
    };

    return {
        ctx: ctx as unknown as CanvasRenderingContext2D,
        fills: () => fills,
    };
}

describe('sinar matahari dari jendela (Tahap 5F langkah 3)', () => {
    it('kaca jendela ada di dinding kanan, di dalam tinggi dinding', () => {
        const w = windowSpan();

        expect(w.u0).toBeGreaterThan(0);
        expect(w.u1).toBeLessThanOrEqual(A);
        expect(w.u1).toBeGreaterThan(w.u0);
        expect(w.z0).toBeGreaterThan(0);
        expect(w.z1).toBeLessThan(WALL_H);
    });

    it('ada saat siang dan senja, tidak ada saat malam', () => {
        expect(sunPatch('siang')).toHaveLength(4);
        expect(sunPatch('senja')).toHaveLength(4);
        expect(sunPatch('malam')).toBeNull();
        expect(SUN.malam).toBeNull();

        const malam = counter();
        drawSunlight(malam.ctx, STORE_SCENE, 'malam');
        expect(malam.fills()).toBe(0);

        const siang = counter();
        drawSunlight(siang.ctx, STORE_SCENE, 'siang');
        expect(siang.fills()).toBeGreaterThan(0);
    });

    it('siang jatuh di lantai kosong dekat jendela, tidak tertutup perabot', () => {
        const patch = sunPatch('siang')!;
        const i = patch.reduce((s, q) => s + q.i, 0) / 4;
        const j = patch.reduce((s, q) => s + q.j, 0) / 4;

        expect(i).toBeGreaterThan(0);
        expect(i).toBeLessThan(A);
        expect(j).toBeGreaterThan(0);
        expect(j).toBeLessThan(B);
        expect(occupied(Math.floor(i / T), Math.floor(j / T))).toBe(false);
    });

    it('senja lebih panjang ke dalam ruangan dan warnanya oranye', () => {
        const far = (t: 'siang' | 'senja') =>
            Math.max(...sunPatch(t)!.map((q) => q.j));

        expect(far('senja')).toBeGreaterThan(far('siang'));
        expect(SUN.senja!.rgb).not.toBe(SUN.siang!.rgb);
    });

    it('selubung cembung membuang titik di dalam', () => {
        const hull = convexHull([
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
            { x: 5, y: 5 },
        ]);

        expect(hull).toHaveLength(4);
        expect(hull).not.toContainEqual({ x: 5, y: 5 });
    });
});

describe('kolam cahaya lampu dinding', () => {
    it('satu kolam per lampu, di lantai dekat dindingnya', () => {
        const pools = lampPoolCenters();

        expect(pools).toHaveLength(2);

        for (const p of pools) {
            expect(p.i).toBeGreaterThan(0);
            expect(p.i).toBeLessThan(A);
            expect(p.j).toBeGreaterThan(0);
            expect(p.j).toBeLessThan(B);
            expect(Math.min(p.i, p.j)).toBe(LAMP_POOL.fromWall);
        }
    });

    it('hanya saat senja dan malam', () => {
        const siang = counter();
        drawLampPools(siang.ctx, STORE_SCENE, 'siang');
        expect(siang.fills()).toBe(0);

        const malam = counter();
        drawLampPools(malam.ctx, STORE_SCENE, 'malam');
        expect(malam.fills()).toBe(2);
    });
});

describe('bloom: kanvas cahaya kecil', () => {
    it('seperempat kanvas utama', () => {
        expect(GLOW_W).toBe(192);
        expect(GLOW_H).toBe(120);
    });

    it('kunci keadaan tetap bila tidak ada yang berubah, berubah bila waktu berganti', () => {
        const world = new DioramaWorld({ seed: 7 });
        const renderer = new PlaceholderRenderer(world.scene);

        expect(renderer.glowKey(world, 'siang')).toBe(
            renderer.glowKey(world, 'siang'),
        );
        expect(renderer.glowKey(world, 'malam')).not.toBe(
            renderer.glowKey(world, 'siang'),
        );
    });
});
