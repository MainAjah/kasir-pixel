import { describe, expect, it } from 'vite-plus/test';
import { packAtlas } from '../assets/atlas';
import { storeEntries } from '../assets/procedural-source';
import { STORE_SCENE } from '../scenes/store-scene';
import { TILE_SHADE, buildStore, tileShade } from './build-store';
import { cameraBasis } from './camera-math';

function build() {
    const entries = storeEntries(STORE_SCENE);
    const layout = packAtlas(
        entries.map((e) => ({
            key: e.key,
            w: e.matrix.width,
            h: e.matrix.height,
        })),
    );

    return {
        layout,
        arrays: buildStore(STORE_SCENE, layout, (k) => layout.frames[k]),
    };
}

describe('geometri balok toko (Tahap 5H a1)', () => {
    it('lantai empat quad per ubin (oklusi halus, a3) + 8 muka dinding dan alas', () => {
        const { arrays } = build();
        const quads = arrays.positions.length / 12;

        expect(quads).toBe(12 * 9 * 4 + 8);
        expect(arrays.vertexNormals).toHaveLength(quads * 12);
        expect(arrays.indices).toHaveLength(quads * 6);
        expect(arrays.uvs).toHaveLength(quads * 8);
        expect(arrays.colors).toHaveLength(quads * 12);
    });

    it('semua muka menghadap kamera (tidak ada muka belakang yang terlihat)', () => {
        const { arrays } = build();

        for (const pitch of [30, 35, 40]) {
            const { back } = cameraBasis(pitch);

            for (const n of arrays.normals) {
                expect(
                    n[0] * back[0] + n[1] * back[1] + n[2] * back[2],
                ).toBeGreaterThan(0);
            }
        }
    });

    it('UV di dalam atlas', () => {
        const { arrays } = build();

        for (const v of arrays.uvs) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
        }
    });

    it('variasi kecerahan lantai per ubin kecil dan tetap', () => {
        for (let gx = 0; gx < 12; gx++) {
            for (let gy = 0; gy < 9; gy++) {
                const s = tileShade(gx, gy);
                expect(Math.abs(s - 1)).toBeLessThanOrEqual(TILE_SHADE);
                expect(tileShade(gx, gy)).toBe(s);
            }
        }
    });
});
