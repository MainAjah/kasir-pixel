import { describe, expect, it } from 'vite-plus/test';
import { STORE_SCENE } from '../scenes/store-scene';
import { createMatrix, setPixel } from '../sprites/pixels';
import { AtlasRegistry, frameUv, packAtlas, rasterizeAtlas } from './atlas';
import type { AssetSource, AtlasPack } from './atlas';
import { REQUIRED_KEYS, STORE_KEYS, storeEntries } from './procedural-source';

function overlaps(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
    pad: number,
): boolean {
    return !(
        a.x + a.w + pad <= b.x - pad ||
        b.x + b.w + pad <= a.x - pad ||
        a.y + a.h + pad <= b.y - pad ||
        b.y + b.h + pad <= a.y - pad
    );
}

describe('atlas aset (Tahap 5H)', () => {
    it('bingkai balok toko muat di satu atlas 1024 tanpa tumpang tindih', () => {
        const entries = storeEntries(STORE_SCENE);
        const layout = packAtlas(
            entries.map((e) => ({
                key: e.key,
                w: e.matrix.width,
                h: e.matrix.height,
            })),
        );
        const frames = Object.entries(layout.frames);

        expect(layout.width).toBe(1024);
        expect(layout.height).toBeLessThanOrEqual(1024);
        expect(Math.log2(layout.height) % 1).toBe(0);

        for (const [, f] of frames) {
            expect(f.x - layout.padding).toBeGreaterThanOrEqual(0);
            expect(f.y - layout.padding).toBeGreaterThanOrEqual(0);
            expect(f.x + f.w + layout.padding).toBeLessThanOrEqual(
                layout.width,
            );
            expect(f.y + f.h + layout.padding).toBeLessThanOrEqual(
                layout.height,
            );
        }

        for (let i = 0; i < frames.length; i++) {
            for (let j = i + 1; j < frames.length; j++) {
                expect(
                    overlaps(frames[i][1], frames[j][1], layout.padding),
                    `${frames[i][0]} × ${frames[j][0]}`,
                ).toBe(false);
            }
        }
    });

    it('semua kunci yang dibutuhkan renderer ada, ukurannya sesuai denah', () => {
        const entries = storeEntries(STORE_SCENE);
        const keys = entries.map((e) => e.key);
        const size = (key: string) => {
            const m = entries.find((e) => e.key === key)!.matrix;

            return [m.width, m.height];
        };

        expect(keys).toEqual(expect.arrayContaining([...REQUIRED_KEYS]));
        expect(size(STORE_KEYS.lantai)).toEqual([192, 144]);
        expect(size(STORE_KEYS.dindingKiri)).toEqual([144, 80]);
        expect(size(STORE_KEYS.dindingKanan)).toEqual([192, 80]);
        expect(size(STORE_KEYS.alasDepanKiri)).toEqual([196, 23]);
        expect(size(STORE_KEYS.alasDepanKanan)).toEqual([148, 23]);
    });

    it('kunci ganda ditolak', () => {
        expect(() =>
            packAtlas([
                { key: 'a', w: 4, h: 4 },
                { key: 'a', w: 4, h: 4 },
            ]),
        ).toThrow();
    });

    it('UV menunjuk bingkai, v dihitung dari atas gambar', () => {
        const uv = frameUv(
            { x: 2, y: 2, w: 16, h: 8, pivot: { x: 0, y: 0 } },
            { width: 64, height: 32 },
        );

        expect(uv).toEqual({
            u0: 2 / 64,
            v0: 2 / 32,
            u1: 18 / 64,
            v1: 10 / 32,
        });
    });

    it('padding diisi ulangan tepi supaya sampel nearest tidak rembes', () => {
        const m = createMatrix(2, 1);
        setPixel(m, 0, 0, '#ff0000');
        setPixel(m, 1, 0, '#0000ff');
        const layout = packAtlas([{ key: 'k', w: 2, h: 1 }], {
            width: 8,
            padding: 2,
        });
        const data = rasterizeAtlas(layout, [{ key: 'k', matrix: m }]);
        const at = (x: number, y: number) => {
            const i = (y * layout.width + x) * 4;

            return [data[i], data[i + 1], data[i + 2], data[i + 3]];
        };
        const f = layout.frames.k;

        expect(at(f.x - 2, f.y)).toEqual([255, 0, 0, 255]);
        expect(at(f.x + 3, f.y + 2)).toEqual([0, 0, 255, 255]);
    });

    it('registri: sumber pertama didahulukan, sisanya jatuh ke sumber berikutnya', async () => {
        const fake = (id: string, keys: string[]): AssetSource => ({
            id,
            load: async (): Promise<AtlasPack> => ({
                source: id,
                image: {} as TexImageSource,
                layout: packAtlas(keys.map((key) => ({ key, w: 2, h: 2 }))),
            }),
        });
        const registry = new AtlasRegistry([
            fake('paket', ['tex/lantai/walnut']),
            fake('procedural', ['tex/lantai/walnut', 'tex/dinding/kiri']),
        ]);
        await registry.load();

        expect(registry.find('tex/lantai/walnut')?.pack.source).toBe('paket');
        expect(registry.find('tex/dinding/kiri')?.pack.source).toBe(
            'procedural',
        );
        expect(registry.missing(['tex/dinding/kiri', 'tex/tidak-ada'])).toEqual(
            ['tex/tidak-ada'],
        );
    });
});
