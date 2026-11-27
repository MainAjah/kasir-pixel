import { describe, expect, it } from 'vite-plus/test';
import { STORE_SCENE } from '../scenes/store-scene';
import { WALL_DECOR } from '../sprites/decor-sprite';
import { beamMesh, wallCaster, withAmbientOcclusion } from './build-lighting';
import { furnitureBox } from './build-furniture';
import {
    ALL_EFFECTS,
    EFFECT_ORDER,
    NO_EFFECTS,
    TIERS,
    effectsFromQuery,
    resolveEffects,
} from './effects';
import {
    SUN_ELEVATION_DEG,
    SUN_TOWARD,
    ambientOcclusion,
    beamCorners,
    dustParams,
    lampBulbPosition,
    lampFalloff,
    lampIrradiance,
    rayHitsBox,
    sunVisible,
    windowGlassRect,
    windowMullions,
} from './lighting-math';
import { FrameStats, PerfGovernor, percentile } from './perf';
import { WALL_H } from './space';

const X = STORE_SCENE.width;
const box = (id: string) =>
    furnitureBox(STORE_SCENE.furniture.find((f) => f.id === id)!);

describe('matahari senja dan jendela (Tahap 5H a3)', () => {
    it('matahari rendah ±18° datang dari belakang dinding kanan dan sisi kanan', () => {
        expect(SUN_ELEVATION_DEG).toBeGreaterThan(14);
        expect(SUN_ELEVATION_DEG).toBeLessThan(22);
        expect(SUN_TOWARD[0]).toBeGreaterThan(0);
        expect(SUN_TOWARD[2]).toBeLessThan(0);
        expect(Math.hypot(...SUN_TOWARD)).toBeCloseTo(1);
    });

    it('kaca jendela di dinding kanan, di dalam bingkai gambar jendela Canvas', () => {
        const g = windowGlassRect();
        const decor = WALL_DECOR.find((d) => d.key === 'jendela')!;

        expect(g.x0).toBeGreaterThan(decor.tile);
        expect(g.x1).toBeLessThan(decor.tile + 1);
        expect(g.y1).toBeLessThan(WALL_H);
        expect(g.y0).toBeGreaterThan(0);
        expect(windowMullions()).toHaveLength(2);
    });

    it('setengah belakang lantai teduh oleh dinding, depan terkena matahari', () => {
        expect(sunVisible([5, 0, 1.5], [], X)).toBe(false);
        expect(sunVisible([5, 0, 8], [], X)).toBe(true);
    });

    it('sinar lewat kaca jendela menerangi lantai di jatuhnya, kusen menghalangi', () => {
        const { floor } = beamCorners();
        const cx = floor.reduce((s, p) => s + p[0], 0) / 4;
        const cz = floor.reduce((s, p) => s + p[2], 0) / 4;
        // Tengah bidang jatuh tepat di bayangan kusen silang; sedikit di sampingnya terang.
        const lit = [0.15, -0.15].some((d) =>
            sunVisible([cx + d, 0, cz + d], [], X),
        );

        expect(lit).toBe(true);
        expect(cz).toBeGreaterThan(1);
        expect(cz).toBeLessThan(5);
    });

    it('perabot di antara titik dan matahari meneduhkan', () => {
        const rack = box('rak-a');

        // Di depan rak (z lebih besar) sinar datang dari belakang rak: teduh.
        expect(rayHitsBox([4, 0.1, 3.5], SUN_TOWARD, rack)).toBe(true);
        // Di kanan rak, sinar menjauh dari rak: tidak terhalang.
        expect(rayHitsBox([8, 0.1, 6], SUN_TOWARD, rack)).toBe(false);
        expect(rayHitsBox([1, 0.1, 6], SUN_TOWARD, rack)).toBe(false);
        expect(
            rayHitsBox([rack.x0 - 0.2, 0.2, rack.z1 + 0.3], SUN_TOWARD, rack),
        ).toBe(true);
        expect(sunVisible([rack.x0 - 0.2, 0.2, rack.z1 + 0.3], [rack], X)).toBe(
            false,
        );
    });
});

describe('geometri cahaya', () => {
    it('penghalang dinding kanan berlubang tepat di kaca, dengan kusen', () => {
        const caster = wallCaster(X);
        const quads = caster.positions.length / 12;

        expect(quads).toBe(4 + 2);
        expect(caster.indices).toHaveLength(quads * 6);
        // Tidak ada sudut penghalang yang berada di dalam kaca selain kusen.
        const g = windowGlassRect();
        const [mv, mh] = windowMullions();
        const inside = (x: number, y: number) =>
            x > g.x0 + 1e-6 &&
            x < g.x1 - 1e-6 &&
            y > g.y0 + 1e-6 &&
            y < g.y1 - 1e-6;
        const onMullion = (x: number, y: number) =>
            [mv, mh].some(
                (m) =>
                    x >= m.x0 - 1e-6 &&
                    x <= m.x1 + 1e-6 &&
                    y >= m.y0 - 1e-6 &&
                    y <= m.y1 + 1e-6,
            );

        for (let i = 0; i < caster.positions.length; i += 3) {
            const [x, y] = [caster.positions[i], caster.positions[i + 1]];
            expect(!inside(x, y) || onMullion(x, y)).toBe(true);
        }
    });

    it('prisma berkas: empat sisi dari kaca (along 0) ke lantai (along 1)', () => {
        const beam = beamMesh();

        expect(beam.positions.length / 3).toBe(16);
        expect(beam.along.filter((a) => a === 0)).toHaveLength(8);

        for (let i = 0; i < 16; i++) {
            if (beam.along[i] === 1) {
                expect(beam.positions[i * 3 + 1]).toBeCloseTo(0);
            }
        }
    });

    it('oklusi: kaki dinding dan sekitar perabot lebih gelap, tengah lantai terbuka', () => {
        const boxes = [box('rak-a')];
        const open = ambientOcclusion([6, 0, 7.5], boxes);
        const corner = ambientOcclusion([0, 0, 0], boxes);
        const nearRack = ambientOcclusion([4, 0, 3.05], boxes);

        expect(open).toBeGreaterThan(0.95);
        expect(corner).toBeLessThan(0.6);
        expect(nearRack).toBeLessThan(open);
        expect(corner).toBeGreaterThanOrEqual(0.45);

        const colors = withAmbientOcclusion(
            { positions: [0, 0, 0, 6, 0, 7.5], colors: [1, 1, 1, 1, 1, 1] },
            boxes,
        );
        expect(colors[0]).toBeLessThan(colors[3]);
    });

    it('lampu: redaman sama dengan three.js, nol di luar jangkauan', () => {
        expect(lampFalloff(1, 4.5, 2)).toBeCloseTo((1 - (1 / 4.5) ** 4) ** 2);
        expect(lampFalloff(5, 4.5, 2)).toBe(0);
        const bulb = lampBulbPosition('lampu-kanan')!;
        expect(bulb[2]).toBeGreaterThan(0);
        const lamp = {
            position: bulb,
            color: [1, 0.8, 0.5] as [number, number, number],
            intensity: 2,
            distance: 4.5,
            decay: 2,
        };
        const near = lampIrradiance([bulb[0], 0.5, 1], [lamp]);
        const far = lampIrradiance([bulb[0] - 4, 0.5, 4], [lamp]);
        expect(near[0]).toBeGreaterThan(far[0]);
        expect(far[0]).toBe(0);
    });

    it('debu berbenih dan di dalam rentang', () => {
        const a = dustParams(50, 3);

        expect(a).toEqual(dustParams(50, 3));
        expect(Math.min(...a)).toBeGreaterThanOrEqual(0);
        expect(
            Math.max(...Array.from(a).filter((_, i) => i % 4 !== 3)),
        ).toBeLessThan(1);
    });
});

describe('sakelar efek dan tingkat kualitas', () => {
    it('urutan lab memuat semua efek; garis luar mati secara bawaan', () => {
        expect(EFFECT_ORDER.map((e) => e.key).sort()).toEqual(
            Object.keys(ALL_EFFECTS).sort(),
        );
        expect(ALL_EFFECTS.garisLuar).toBe(false);
        expect(Object.values(NO_EFFECTS).every((v) => !v)).toBe(true);
    });

    it('tingkat memotong efek mahal berurutan', () => {
        expect(TIERS[0].shadowMap).toBe(1024);
        expect(TIERS[1].shadowMap).toBe(512);
        expect(resolveEffects(ALL_EFFECTS, 1, false).debu).toBe(false);
        expect(resolveEffects(ALL_EFFECTS, 2, false).blur).toBe('tilt');
        expect(resolveEffects(ALL_EFFECTS, 2, false).bloomLevels).toBe(2);
        const t3 = resolveEffects(ALL_EFFECTS, 3, false);
        expect([t3.shadowMap, t3.bloom, t3.dof, t3.berkas]).toEqual([
            0,
            false,
            false,
            false,
        ]);
    });

    it('gerak dikurangi mematikan debu; debu dan berkas ikut matahari', () => {
        expect(resolveEffects(ALL_EFFECTS, 0, true).debu).toBe(false);
        const noSun = resolveEffects(
            { ...ALL_EFFECTS, matahari: false },
            0,
            false,
        );
        expect([noSun.debu, noSun.berkas, noSun.shadowMap]).toEqual([
            false,
            false,
            0,
        ]);
    });

    it('efek dari query alamat', () => {
        expect(effectsFromQuery(null)).toEqual(ALL_EFFECTS);
        expect(effectsFromQuery('dasar')).toEqual(NO_EFFECTS);
        const some = effectsFromQuery('ambien,bloom');
        expect([some.ambien, some.bloom, some.matahari]).toEqual([
            true,
            true,
            false,
        ]);
    });
});

describe('beban bingkai dan penjaga performa', () => {
    const feed = (stats: FrameStats, n: number, cpu: number, interval = 33) => {
        for (let i = 0; i < n; i++) {
            stats.push({ interval, cpu });
        }
    };

    it('persentil dan FPS', () => {
        expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
        expect(percentile([5, 1, 3, 2, 4], 90)).toBe(5);
        const s = new FrameStats();
        feed(s, 30, 4);
        expect(s.fps()).toBeCloseTo(1000 / 33);
        expect(s.cpu(90)).toBe(4);
        expect(s.gpu(50)).toBeNull();
    });

    it('turun setelah 3 detik berat, paling cepat satu langkah per 5 detik', () => {
        const s = new FrameStats();
        feed(s, 60, 35);
        const g = new PerfGovernor(0);

        expect(g.update(0, s).tier).toBe(0);
        expect(g.update(2.5, s).tier).toBe(0);
        expect(g.update(3.1, s).tier).toBe(1);
        expect(g.update(6, s).tier).toBe(1);
        expect(g.update(9, s).tier).toBe(2);
    });

    it('naik lagi setelah 10 detik ringan; tingkat 3 berat lama → sarankan Canvas', () => {
        const light = new FrameStats();
        feed(light, 60, 5);
        const up = new PerfGovernor(2);
        expect(up.update(0, light).tier).toBe(2);
        expect(up.update(10.5, light).tier).toBe(1);

        const heavy = new FrameStats();
        feed(heavy, 60, 40);
        const down = new PerfGovernor(3);
        expect(down.update(0, heavy).fallback).toBe(false);
        expect(down.update(5.5, heavy).fallback).toBe(true);
    });

    it('bingkai terlewat juga dihitung berat', () => {
        const s = new FrameStats();
        feed(s, 60, 2, 80);
        expect(s.missedRatio()).toBe(1);
        const g = new PerfGovernor(0);
        g.update(0, s);
        expect(g.update(3.5, s).tier).toBe(1);
    });
});
