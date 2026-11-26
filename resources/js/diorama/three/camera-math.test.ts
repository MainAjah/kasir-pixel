import { describe, expect, it } from 'vite-plus/test';
import { STORE_SCENE } from '../scenes/store-scene';
import { storeCorners } from './build-store';
import {
    cameraBasis,
    driftTarget,
    focusDistance,
    fovFor,
    frameOf,
    projectOrtho,
    snapToPixel,
    springStep,
    viewportFor,
} from './camera-math';
import { PX_PER_UNIT, TEXEL, TEXEL_V } from './space';

const ORIGIN = [0, 0, 0] as const;

describe('kamera diorama 3D (Tahap 5H)', () => {
    it('kemiringan 30°, arah 45°: satu ubin = belah ketupat 64 × 32 seperti Canvas', () => {
        const b = cameraBasis(30);
        const ex = projectOrtho([1, 0, 0], ORIGIN, b);
        const ez = projectOrtho([0, 0, 1], ORIGIN, b);

        // +gx ke kanan-bawah, +gy ke kiri-bawah (y layar ke atas).
        expect(ex.x).toBeCloseTo(32);
        expect(ex.y).toBeCloseTo(-16);
        expect(ez.x).toBeCloseTo(-32);
        expect(ez.y).toBeCloseTo(-16);
    });

    it('satu texel lantai = langkah 2 × 1 piksel; satu texel tegak = 1 piksel', () => {
        const b = cameraBasis(30);
        const step = projectOrtho([TEXEL, 0, 0], ORIGIN, b);
        const up = projectOrtho([0, TEXEL_V, 0], ORIGIN, b);

        expect(step.x).toBeCloseTo(2);
        expect(step.y).toBeCloseTo(-1);
        expect(up.y).toBeCloseTo(1);
    });

    it('basis kamera ortonormal dan kanan × atas = arah ke penonton', () => {
        for (const pitch of [30, 35, 40]) {
            const { back, right, up } = cameraBasis(pitch);
            const dot = (a: readonly number[], c: readonly number[]) =>
                a[0] * c[0] + a[1] * c[1] + a[2] * c[2];

            expect(dot(back, right)).toBeCloseTo(0);
            expect(dot(back, up)).toBeCloseTo(0);
            expect(dot(right, up)).toBeCloseTo(0);
            expect(dot(up, up)).toBeCloseTo(1);
            expect(back[1]).toBeGreaterThan(0);
        }
    });

    it('bingkai balok toko: target membuat balok tepat di tengah', () => {
        const b = cameraBasis(30);
        const frame = frameOf(storeCorners(STORE_SCENE), b, 0);
        const points = storeCorners(STORE_SCENE).map((p) =>
            projectOrtho(p, frame.center, b),
        );
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);

        expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0);
        expect(Math.min(...ys) + Math.max(...ys)).toBeCloseTo(0);

        // Bidang fokus melewati kedalaman tengah balok (lensa perspektif tidak
        // memperbesar balok seluruhnya).
        const depth = (p: readonly number[]) =>
            p[0] * b.back[0] + p[1] * b.back[1] + p[2] * b.back[2];
        const depths = storeCorners(STORE_SCENE).map(depth);
        expect(depth(frame.center)).toBeCloseTo(
            (Math.min(...depths) + Math.max(...depths)) / 2,
        );
        // Seukuran diorama Canvas: lantai 12 + 9 ubin selebar (12 + 9) × 32 px.
        expect(frame.width).toBeGreaterThan(21 * 32);
        expect(frame.width).toBeLessThan(768);
    });

    it('skala bulat bila memungkinkan, pecahan bila bulat mengecilkan > 20%', () => {
        const frame = { width: 730, height: 495 };
        const fhd = viewportFor(1920, 1080, frame);
        const hd = viewportFor(1366, 768, frame);

        expect(fhd).toEqual({
            scale: 2,
            width: 960,
            height: 540,
            integer: true,
        });
        expect(hd.integer).toBe(false);
        expect(hd.scale).toBeCloseTo(768 / 495);
        expect(hd.height).toBeGreaterThanOrEqual(495);
    });

    it('geser kamera dibulatkan ke piksel dalam, sisa pecahan |f| ≤ 0,5', () => {
        for (const u of [0, 0.013, -0.05, 0.149, 1.2345]) {
            const s = snapToPixel(u);
            expect(Math.abs(s.fraction)).toBeLessThanOrEqual(0.5);
            expect(s.snapped * PX_PER_UNIT).toBeCloseTo(
                Math.round(u * PX_PER_UNIT),
            );
            expect(
                (s.snapped * PX_PER_UNIT + s.fraction) / PX_PER_UNIT,
            ).toBeCloseTo(u);
        }
    });

    it('target geser dijepit ±0,15 ubin, y layar dibalik', () => {
        expect(driftTarget(0, 0)).toEqual({ x: 0, y: -0 });
        expect(driftTarget(5, -5)).toEqual({ x: 0.15, y: 0.15 });
        expect(driftTarget(-1, 1)).toEqual({ x: -0.15, y: -0.15 });
    });

    it('pegas teredam kritis tiba tanpa memantul dalam ±0,6 detik', () => {
        let s = { value: 0, velocity: 0 };
        let peak = 0;

        for (let i = 0; i < 18; i++) {
            s = springStep(s.value, s.velocity, 1, 1 / 30);
            peak = Math.max(peak, s.value);
        }

        expect(s.value).toBeGreaterThan(0.95);
        expect(peak).toBeLessThanOrEqual(1);
    });

    it('lensa panjang: bidang fokus tetap PX_PER_UNIT piksel per satuan', () => {
        const d = focusDistance(10);

        expect(fovFor(480, d)).toBeCloseTo(10);
        expect(fovFor(540, d)).toBeGreaterThan(10);
    });
});
