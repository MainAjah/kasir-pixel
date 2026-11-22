import { describe, expect, it } from 'vite-plus/test';
import {
    NIGHT_ALPHA,
    decorMatrix,
    drawLitWall,
    drawNightOverlay,
    drawWallDecor,
} from '../render/lighting';
import {
    CLOCK_TIME,
    NIGHT_STRENGTH,
    PAINTINGS,
    TIMES_OF_DAY,
    WALL_DECOR,
    DOOR_GLASS_H,
    clockMatrix,
    doorViewColor,
    drawPlant,
    lampMatrix,
    windowGlass,
    windowMatrix,
} from './decor-sprite';
import type { PaintingKey, TimeOfDay } from './decor-sprite';
import { C, isPaletteColor } from './palette';
import { colorsOf } from './pixels';
import { drawDoorGlass, drawRoom } from './room-sprite';
import { CANVAS_H, CANVAS_W, tileTop } from '../engine/iso';
import { STORE_SCENE } from '../scenes/store-scene';

/** Semua warna pemandangan di balik pintu kaca (64 × 70) untuk satu waktu. */
function doorView(time: TimeOfDay): Set<string> {
    const colors = new Set<string>();

    for (let u = 0; u < 64; u++) {
        for (let v = 0; v < DOOR_GLASS_H; v++) {
            colors.add(doorViewColor(u, v, time));
        }
    }

    return colors;
}

/** Warna piksel terakhir di ruangan yang digambar untuk satu waktu. */
function roomPixel(time: TimeOfDay, x: number, y: number): string | undefined {
    let color: string | undefined;
    record((ctx) =>
        drawRoom(ctx, STORE_SCENE, CANVAS_W, CANVAS_H, undefined, time),
    ).forEach((f) => {
        if (x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h) {
            color = f.color;
        }
    });

    return color;
}

type Fill = {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    alpha: number;
    op: string;
};

/** Kanvas palsu yang mencatat setiap fillRect beserta warna, transparansi, dan cara campur. */
function record(draw: (ctx: CanvasRenderingContext2D) => void): Fill[] {
    const fills: Fill[] = [];
    const ctx = {
        fillStyle: '#000000',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        fillRect(x: number, y: number, w: number, h: number) {
            fills.push({
                x,
                y,
                w,
                h,
                color: String(this.fillStyle),
                alpha: this.globalAlpha,
                op: this.globalCompositeOperation,
            });
        },
    };
    draw(ctx as unknown as CanvasRenderingContext2D);

    return fills;
}

describe('hiasan hanya memakai palet 24', () => {
    it('jendela, jam, lampu, dan empat lukisan', () => {
        const matrices = [
            ...TIMES_OF_DAY.map(windowMatrix),
            ...TIMES_OF_DAY.map((t) => clockMatrix(...CLOCK_TIME[t])),
            lampMatrix(true),
            lampMatrix(false),
            ...(Object.keys(PAINTINGS) as PaintingKey[]).map((k) =>
                PAINTINGS[k](),
            ),
        ];

        for (const m of matrices) {
            expect([...colorsOf(m)].every(isPaletteColor)).toBe(true);
        }
    });

    it('tanaman pot', () => {
        const colors = new Set(
            record((ctx) => drawPlant(ctx, 40, 20)).map((f) => f.color),
        );

        expect(colors.size).toBeGreaterThan(3);
        expect([...colors].every(isPaletteColor)).toBe(true);
    });

    it('empat lukisan dari rancangan 5A', () => {
        expect(Object.keys(PAINTINGS).sort()).toEqual([
            'buah',
            'bunga',
            'gunung',
            'laut',
        ]);
        expect(
            WALL_DECOR.filter((d) => d.key.startsWith('lukisan-')),
        ).toHaveLength(4);
    });
});

describe('jendela siang dan malam berbintang', () => {
    it('siang: langit biru tanpa biru malam', () => {
        const colors = colorsOf(windowMatrix('siang'));

        expect(colors.has(C(18))).toBe(true);
        expect(colors.has(C(24))).toBe(false);
    });

    it('malam: langit biru malam dengan bintang dan bulan kuning', () => {
        const m = windowMatrix('malam');
        const colors = colorsOf(m);
        const yellow = m.pixels.filter((p) => p === C(11)).length;

        expect(colors.has(C(24))).toBe(true);
        expect(colors.has(C(18))).toBe(false);
        // Bulan sabit dan beberapa bintang.
        expect(yellow).toBeGreaterThan(8);
    });

    it('senja: langit lavender, merah muda, dan kunyit', () => {
        const colors = colorsOf(windowMatrix('senja'));

        expect(colors.has(C(17))).toBe(true);
        expect(colors.has(C(13))).toBe(true);
    });

    it('kusen silang sama di semua waktu', () => {
        for (const t of TIMES_OF_DAY) {
            const m = windowMatrix(t);

            expect(m.pixels[13 * m.width + 3]).toBe(C(20));
            expect(m.pixels[5 * m.width + 12]).toBe(C(20));
        }
    });
});

describe('jam, lampu, dan lapisan malam', () => {
    it('jarum jam berbeda tiap waktu', () => {
        const faces = TIMES_OF_DAY.map((t) =>
            clockMatrix(...CLOCK_TIME[t]).pixels.join(),
        );

        expect(new Set(faces).size).toBe(3);
    });

    it('lampu: bola kuning saat menyala, krem saat mati', () => {
        expect(colorsOf(lampMatrix(true)).has(C(11))).toBe(true);
        expect(colorsOf(lampMatrix(false)).has(C(11))).toBe(false);
        expect(decorMatrix('lampu-kanan', 'siang')?.pixels).toEqual(
            lampMatrix(false).pixels,
        );
        expect(decorMatrix('lampu-kanan', 'malam')?.pixels).toEqual(
            lampMatrix(true).pixels,
        );
    });

    it('siang tanpa lapisan; senja setengah, malam penuh, warna biru malam palet', () => {
        expect(
            record((ctx) => drawNightOverlay(ctx, 'siang', 768, 432)),
        ).toHaveLength(0);
        expect(record((ctx) => drawLitWall(ctx, 'siang'))).toHaveLength(0);

        const dusk = record((ctx) => drawNightOverlay(ctx, 'senja', 768, 432));
        const night = record((ctx) => drawNightOverlay(ctx, 'malam', 768, 432));

        expect(dusk[0]).toMatchObject({
            w: 768,
            h: 432,
            color: C(24),
            alpha: NIGHT_ALPHA * NIGHT_STRENGTH.senja,
        });
        expect(night[0]).toMatchObject({ color: C(24), alpha: NIGHT_ALPHA });
    });

    it('malam: jendela dan lampu menyala digambar ulang terang, pendar memakai palet', () => {
        const fills = record((ctx) => drawLitWall(ctx, 'malam'));
        const opaque = fills.filter((f) => f.alpha === 1);
        const glows = fills.filter((f) => f.alpha < 1);

        expect(opaque.some((f) => f.color === C(24))).toBe(true); // langit malam di jendela
        expect(opaque.some((f) => f.color === C(11))).toBe(true); // bintang dan bola lampu
        expect(glows.length).toBeGreaterThan(0);
        expect(fills.every((f) => isPaletteColor(f.color))).toBe(true);
    });

    it('latar: jam di dinding menunjukkan waktu yang dipilih', () => {
        const day = record((ctx) => drawWallDecor(ctx, 'siang'));
        const night = record((ctx) => drawWallDecor(ctx, 'malam'));

        expect(day.every((f) => isPaletteColor(f.color))).toBe(true);
        expect(day.map((f) => `${f.x},${f.y},${f.color}`).join()).not.toEqual(
            night.map((f) => `${f.x},${f.y},${f.color}`).join(),
        );
    });

    it('lapisan benda dan aktor: biru malam hanya di atas piksel yang ada (source-atop)', () => {
        const fills = record((ctx) =>
            drawNightOverlay(ctx, 'malam', 768, 432, true),
        );

        expect(fills[0]).toMatchObject({ color: C(24), op: 'source-atop' });
    });

    it('kaca jendela saja: tanpa bingkai dan kusen kayu', () => {
        const glass = windowGlass('malam');

        expect(glass.pixels[0]).toBeNull();
        expect(glass.pixels[13 * glass.width + 5]).toBeNull();
        expect(colorsOf(glass).has(C(24))).toBe(true);
        expect(colorsOf(glass).has(C(20))).toBe(false);
    });
});

describe('pintu kaca: siang, senja, malam', () => {
    it('hanya palet 24', () => {
        for (const t of TIMES_OF_DAY) {
            expect([...doorView(t)].every(isPaletteColor)).toBe(true);
        }
    });

    it('siang: langit biru, awan, pepohonan, tanpa biru malam', () => {
        const colors = doorView('siang');

        expect(colors.has(C(18))).toBe(true);
        expect(colors.has(C(4))).toBe(true);
        expect(colors.has(C(10))).toBe(true);
        expect(colors.has(C(24))).toBe(false);
    });

    it('senja: langit lavender ke kunyit dan matahari terbenam', () => {
        const colors = doorView('senja');

        expect(colors.has(C(17))).toBe(true);
        expect(colors.has(C(13))).toBe(true);
        expect(colors.has(C(11))).toBe(true);
        expect(colors.has(C(18))).toBe(false);
    });

    it('malam: langit biru malam berbintang dan siluet pohon', () => {
        const colors = doorView('malam');

        expect(colors.has(C(24))).toBe(true);
        expect(colors.has(C(11))).toBe(true);
        expect(colors.has(C(1))).toBe(true);
        expect(colors.has(C(18))).toBe(false);
    });

    it('kaca pintu di diorama berganti menurut waktu; kaca saja bisa digambar ulang', () => {
        const { x, y } = tileTop(0, STORE_SCENE.door.inside.gy);
        // Kolom ke-10 pintu bawah, 40 px di atas lantai (langit).
        const at: [number, number] = [x - 32 + 10, y + 16 - 5 - 40];

        expect(roomPixel('siang', ...at)).toBe(C(18));
        expect(roomPixel('malam', ...at)).toBe(C(24));

        const glass = record((ctx) => drawDoorGlass(ctx, STORE_SCENE, 'malam'));
        expect(glass.some((f) => f.color === C(20))).toBe(false); // tanpa kayu
        expect(glass.every((f) => isPaletteColor(f.color))).toBe(true);
    });
});
