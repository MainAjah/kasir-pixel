import { describe, expect, it } from 'vite-plus/test';
import { CANVAS_H, CANVAS_W, tileTop } from '../engine/iso';
import { STORE_SCENE } from '../scenes/store-scene';
import { M, isSceneColor } from './palette';
import {
    BASE_H,
    PLANK_W,
    ROOM_SCHEME,
    baseFaceColor,
    drawRoom,
    floorColorAt,
    inlayRect,
} from './room-sprite';

const T = 32;

/** Konteks kanvas palsu: mencatat warna terakhir tiap piksel. */
function paint() {
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

    drawRoom(
        ctx as unknown as CanvasRenderingContext2D,
        STORE_SCENE,
        CANVAS_W,
        CANVAS_H,
    );

    return pixels;
}

describe('lantai, dinding, dan pintu (Tahap 5G, konsep v4)', () => {
    it('hanya memakai palet 24 ditambah palet bahan', () => {
        const used = new Set(paint().values());

        expect([...used].filter((c) => !isSceneColor(c))).toEqual([]);
    });

    it('dinding mawar (berpintu) dan ivory berwainscot, lantai papan walnut', () => {
        const used = new Set(paint().values());

        for (const color of [
            ROOM_SCHEME.wallLeft,
            ROOM_SCHEME.wallRight,
            ROOM_SCHEME.wainscot,
            ROOM_SCHEME.rail,
            ...ROOM_SCHEME.floor.planks,
            ROOM_SCHEME.floor.seam,
        ]) {
            expect(used.has(color)).toBe(true);
        }

        expect(ROOM_SCHEME.wallLeft).toBe(M('mawar'));
        expect(ROOM_SCHEME.wallRight).toBe(M('ivory'));
    });

    it('tanpa karpet di jalur kasir: tile antrean hanya papan kayu', () => {
        const inlay = inlayRect(STORE_SCENE);
        const wood = new Set([
            ...ROOM_SCHEME.floor.planks,
            ROOM_SCHEME.floor.seam,
            ROOM_SCHEME.floor.grain,
        ]);

        for (const slot of STORE_SCENE.queueSlots) {
            for (let i = 0; i < T; i++) {
                for (let j = 0; j < T; j++) {
                    const color = floorColorAt(
                        ROOM_SCHEME,
                        inlay,
                        slot.gx * T + i,
                        slot.gy * T + j,
                    );

                    expect(wood.has(color)).toBe(true);
                }
            }
        }
    });

    it('inlay herringbone berbingkai kuningan di depan pintu masuk', () => {
        const inlay = inlayRect(STORE_SCENE);
        const colors = new Set<string>();

        for (let i = inlay.i0; i < inlay.i1; i++) {
            for (let j = inlay.j0; j < inlay.j1; j++) {
                colors.add(floorColorAt(ROOM_SCHEME, inlay, i, j));
            }
        }

        expect(colors).toEqual(
            new Set([
                ROOM_SCHEME.inlay.light,
                ROOM_SCHEME.inlay.dark,
                ROOM_SCHEME.inlay.frame,
            ]),
        );
        // Menempel ke dinding kiri, di sekitar baris pintu.
        expect(inlay.i0).toBeLessThan(T);
        expect(inlay.j0).toBeLessThan((STORE_SCENE.door.inside.gy - 1) * T);
        expect(inlay.j1).toBeGreaterThan((STORE_SCENE.door.inside.gy + 1) * T);
    });

    it('papan: nat di tiap batas papan dan sambungan ujung selang-seling', () => {
        const inlay = inlayRect(STORE_SCENE);
        const at = (i: number, j: number) =>
            floorColorAt(ROOM_SCHEME, inlay, i, j);

        // Jauh dari inlay: tepi papan (j kelipatan PLANK_W) selalu nat.
        for (let i = 120; i < 200; i++) {
            expect(at(i, 5 * PLANK_W)).toBe(ROOM_SCHEME.floor.seam);
        }

        // Sambungan ujung papan bersebelahan tidak sejajar.
        const joints = (plank: number) =>
            Array.from({ length: 96 }, (_, k) => 120 + k).filter(
                (i) => at(i, plank * PLANK_W + 3) === ROOM_SCHEME.floor.seam,
            );

        expect(joints(5)).not.toEqual(joints(6));
    });

    it('pintu kaca di dinding kiri pada baris pintu, dinding biasa di baris lain', () => {
        const scheme = ROOM_SCHEME;
        const pixels = paint();
        const wallPixel = (gy: number) => {
            const { x, y } = tileTop(0, gy);

            // Kolom ke-10 sisi kiri tile (bukan kusen tengah atau pantulan), 40 px di atas lantai.
            return pixels.get(`${x - 32 + 10},${y + 16 - 5 - 40}`);
        };

        expect(wallPixel(STORE_SCENE.door.inside.gy)).toBe(scheme.door.glass);
        expect(wallPixel(2)).toBe(scheme.wallLeft);
    });

    it('alas diorama tebal terlihat di bawah pojok depan lantai (Tahap 5F)', () => {
        const { base } = ROOM_SCHEME;
        const pixels = paint();
        const { x, y } = tileTop(STORE_SCENE.width - 1, STORE_SCENE.height - 1);
        // Pojok depan lantai = puncak tile + 32; sisi kiri alas tepat di kirinya.
        const front = y + 32;
        const colorsBelow = new Set(
            Array.from({ length: BASE_H }, (_, d) =>
                pixels.get(`${x - 1},${front + 1 + d}`),
            ),
        );

        expect(BASE_H).toBeGreaterThanOrEqual(20);
        // Lis hijau, bata, dan nat sisi kiri, lalu garis bawah gelap.
        expect(colorsBelow.has(base.left.lip)).toBe(true);
        expect(colorsBelow.has(base.left.brick)).toBe(true);
        expect(colorsBelow.has(base.left.mortar)).toBe(true);
        // Kolom tepat di kiri pojok depan: tepi lantainya 1 px di atas pojok.
        expect(pixels.get(`${x - 1},${front - 1 + BASE_H}`)).toBe(base.edge);
        // Sisi kanan lebih gelap: bata kanan di kanan pojok depan.
        expect([base.right.brick, base.right.brickLight]).toContain(
            pixels.get(`${x + 2},${front + 8}`),
        );
    });

    it('pola bata: nat tiap lapis, sambungan selang-seling antarlapis', () => {
        const face = ROOM_SCHEME.base.left;
        const edge = ROOM_SCHEME.base.edge;
        // Baris 5..9 lapis pertama, baris 10 nat, baris 11..15 lapis kedua.
        expect(baseFaceColor(face, edge, 3, 0)).toBe(face.lip);
        expect(baseFaceColor(face, edge, 3, 4)).toBe(face.lipShadow);
        expect(baseFaceColor(face, edge, 3, 10)).toBe(face.mortar);
        expect(baseFaceColor(face, edge, 0, 6)).toBe(face.mortar);
        expect(baseFaceColor(face, edge, 0, 12)).not.toBe(face.mortar);
        expect(baseFaceColor(face, edge, 6, 12)).toBe(face.mortar);
        expect(baseFaceColor(face, edge, 3, BASE_H)).toBe(edge);
    });
});
