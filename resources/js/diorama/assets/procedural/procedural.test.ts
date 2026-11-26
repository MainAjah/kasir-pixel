import { describe, expect, it } from 'vite-plus/test';
import { getPixel } from '../../sprites/pixels';
import type { PixelMatrix } from '../../sprites/pixels';
import { W, isWorldColor } from '../../three/palette-world';
import {
    BASE_TEXELS,
    BRICK_LEN,
    COURSE_H,
    COURSE_TOP,
    COURSES,
    brickTexture,
} from './brick';
import { bayer, ditherMix, step } from './dither';
import { leafTexture } from './leaf';
import { marbleTexture } from './marble';
import { hash2, valueNoise } from './noise';
import {
    PANEL_ROWS,
    PLASTER_ROWS,
    PLINTH_ROWS,
    WALL_TEXELS,
    wallCapTexture,
    wallEndTexture,
    wallTexture,
} from './wall';
import { PLANK_GAP, plankTexture } from './wood';

function colors(m: PixelMatrix): Set<string> {
    return new Set(m.pixels.filter((p): p is string => p !== null));
}

function row(m: PixelMatrix, y: number): (string | null)[] {
    return Array.from({ length: m.width }, (_, x) => getPixel(m, x, y));
}

describe('derau dan dither', () => {
    it('hash dan value noise deterministik dan dalam [0, 1)', () => {
        expect(hash2(1, 2, 3)).toBe(hash2(1, 2, 3));
        expect(hash2(1, 2, 3)).not.toBe(hash2(2, 2, 3));

        for (let i = 0; i < 200; i++) {
            const v = valueNoise(9, i * 0.7, i * 1.3, 5);
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('Bayer 4×4 memakai 16 ambang berbeda; campuran 0 dan 1 mutlak', () => {
        const values = new Set<number>();

        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                values.add(bayer(x, y));
                expect(ditherMix(x, y, 0)).toBe(false);
                expect(ditherMix(x, y, 1)).toBe(true);
            }
        }

        expect(values.size).toBe(16);
        expect(step(['a', 'b', 'c'], -3)).toBe('a');
        expect(step(['a', 'b', 'c'], 9)).toBe('c');
    });
});

describe('tekstur procedural Tahap 5H', () => {
    const all: [string, PixelMatrix][] = [
        ['bata', brickTexture(196, 1)],
        ['papan', plankTexture({ width: 192, height: 144, seed: 1 })],
        ['dinding mawar', wallTexture(144, 'mawar', 1)],
        ['dinding ivory', wallTexture(192, 'ivory', 1)],
        ['ujung dinding', wallEndTexture(4, 'mawar', 1)],
        ['tutup dinding', wallCapTexture(148, 4)],
        ['marmer', marbleTexture(48, 32, 1)],
        ['daun', leafTexture(32, 24, 1)],
    ];

    it.each(all)('%s hanya memakai palet dunia', (_, m) => {
        for (const c of colors(m)) {
            expect(isWorldColor(c), c).toBe(true);
        }
    });

    it('benih sama → tekstur sama; benih beda → tekstur beda', () => {
        expect(brickTexture(64, 7)).toEqual(brickTexture(64, 7));
        expect(brickTexture(64, 7)).not.toEqual(brickTexture(64, 8));
        expect(plankTexture({ width: 64, height: 32, seed: 3 })).toEqual(
            plankTexture({ width: 64, height: 32, seed: 3 }),
        );
        expect(wallTexture(48, 'ivory', 2)).toEqual(
            wallTexture(48, 'ivory', 2),
        );
        expect(leafTexture(32, 24, 4)).not.toEqual(leafTexture(32, 24, 5));
    });

    it('bata: lis kuningan di atas, nat di antara lapis, tiga lapis berselang, penuh tanpa lubang', () => {
        const m = brickTexture(BRICK_LEN * 4, 11);

        expect(m.height).toBe(BASE_TEXELS);
        expect(new Set(row(m, 0))).toEqual(new Set([W('kuningan-sorot')]));
        expect(m.pixels.every((p) => p !== null)).toBe(true);

        for (let c = 0; c < COURSES; c++) {
            const mortar = new Set(row(m, COURSE_TOP + c * COURSE_H));
            expect(
                [...mortar].every((p) => p === W('nat-1') || p === W('nat-2')),
            ).toBe(true);
        }

        // Ikatan berselang: sambungan tegak lapis 1 dan 2 tidak segaris.
        const jointColumns = (course: number) => {
            const y = COURSE_TOP + course * COURSE_H + 2;

            return row(m, y)
                .map((p, x) => (p === W('nat-1') || p === W('nat-2') ? x : -1))
                .filter((x) => x >= 0);
        };
        expect(jointColumns(0)).not.toEqual(jointColumns(1));
    });

    it('papan: baris celah tiap 4 texel, ruas bernada walnut', () => {
        const m = plankTexture({ width: 96, height: 32, seed: 2 });

        for (let y = 3; y < 32; y += 4) {
            expect(new Set(row(m, y))).toEqual(new Set([PLANK_GAP]));
        }

        expect(m.pixels.every((p) => p !== null)).toBe(true);
        expect(colors(m).size).toBeGreaterThanOrEqual(4);
    });

    it('dinding: setinggi 80 texel dengan lapisan mahkota, plester, panel, plint', () => {
        const m = wallTexture(96, 'mawar', 3);

        expect(m.height).toBe(WALL_TEXELS);
        expect(getPixel(m, 10, 1)).toBe(W('kuningan'));
        expect([W('mawar'), W('mawar-terang'), W('mawar-gelap')]).toContain(
            getPixel(m, 40, PLASTER_ROWS[0] + 20),
        );
        expect(getPixel(m, 12, PANEL_ROWS[0] + 10)).toBe(W('panel'));
        expect(getPixel(m, 0, PANEL_ROWS[0] + 10)).toBe(W('wainscot'));
        expect(row(m, PLINTH_ROWS[1]).every((p) => p === W('walnut-6'))).toBe(
            true,
        );
        // Ivory memakai plester ivory, bukan mawar.
        expect(colors(wallTexture(96, 'ivory', 3)).has(W('mawar'))).toBe(false);
    });

    it('daun: ada transparan dan beberapa nada daun', () => {
        const m = leafTexture(32, 24, 9);

        expect(m.pixels.some((p) => p === null)).toBe(true);
        expect(colors(m).size).toBeGreaterThanOrEqual(3);
    });
});
