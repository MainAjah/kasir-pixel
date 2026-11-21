import { describe, expect, it } from 'vite-plus/test';
import { CANVAS_H, CANVAS_W, tileTop } from '../engine/iso';
import { STORE_SCENE } from '../scenes/store-scene';
import { isPaletteColor } from './palette';
import { BASE_H, ROOM_SCHEME, drawRoom } from './room-sprite';

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

describe('lantai, dinding, dan pintu', () => {
    it('hanya memakai palet 24 warna', () => {
        const used = new Set(paint().values());

        expect([...used].filter((c) => !isPaletteColor(c))).toEqual([]);
    });

    it('dinding lavender (berpintu) dan biru langit, lantai mint dan krem', () => {
        const used = new Set(paint().values());

        for (const color of [
            ROOM_SCHEME.wallLeft,
            ROOM_SCHEME.wallRight,
            ROOM_SCHEME.floor.a,
            ROOM_SCHEME.floor.b,
        ]) {
            expect(used.has(color)).toBe(true);
        }

        expect(ROOM_SCHEME.wallLeft).toBe('#c9b6e4');
        expect(ROOM_SCHEME.wallRight).toBe('#9fd3e6');
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

    it('alas diorama terlihat di bawah pojok depan lantai', () => {
        const scheme = ROOM_SCHEME;
        const pixels = paint();
        const { x, y } = tileTop(STORE_SCENE.width - 1, STORE_SCENE.height - 1);
        // Pojok depan lantai = puncak tile + 32; alas tepat di bawahnya.
        const below = pixels.get(`${x - 1},${y + 32 + BASE_H - 1}`);

        expect([scheme.base.left, scheme.base.right]).toContain(below);
    });
});
