/**
 * Vending machine minuman (Tahap 5C elemen 3), dipindahkan dari rancangan 5A
 * yang disetujui: badan berwarna (merah, biru, hijau), papan nama "MINUM", kaca
 * berisi 5 baris minuman, pantulan kaca, layar harga, tombol, lubang koin dan
 * uang kertas, pintu ambil, pelat bawah, garis di sisi.
 *
 * Isi 4 tingkat menurut stok (kosong, sedikit, setengah, penuh): 0, 1, 3, atau
 * 5 botol per baris. Lampu papan nama dan lampu di atas kaca menyala-redup
 * pelan. Hanya palet 24 warna.
 */
import { isoBox, leftDot, leftText, rightDot } from '../render/pixel';
import { C } from './palette';
import type { RackFill } from './rack-sprite';

export type VendingColor = 0 | 1 | 2;

/** [badan depan, sisi]: merah, biru, hijau. */
const BODY: readonly (readonly [string, string])[] = [
    [C(14), C(15)],
    [C(18), C(19)],
    [C(9), C(10)],
];
/** Warna botol, bergiliran per baris dan kolom. */
const BOTTLES = [C(14), C(12), C(9), C(16), C(19), C(17)];
const BOTTLES_PER_ROW: Record<RackFill, number> = {
    kosong: 0,
    sedikit: 1,
    setengah: 3,
    penuh: 5,
};

export const VENDING_HEIGHT = 76;
const A = 30;
const B = 22;

/** Kanvas cadangan satu mesin dan letak puncak tile di dalamnya. */
export const VENDING_CANVAS = {
    width: 54,
    height: 104,
    originX: 22,
    originY: 77,
} as const;

/** Lama satu fase lampu (detik): menyala lalu redup. */
export const VENDING_BLINK = 1.2;

/** Lampu menyala pada waktu ini? Tiap mesin punya fase sendiri. */
export function vendingLightOn(time: number, color: VendingColor): boolean {
    return Math.floor((time + color * 0.7) / VENDING_BLINK) % 2 === 0;
}

export function bottlesPerRow(fill: RackFill): number {
    return BOTTLES_PER_ROW[fill];
}

/**
 * Papan nama "MINUM" yang menyala (kuning lampu) atau redup (krem), dan lampu
 * di atas kaca. Juga digambar ulang di atas lapisan malam saat menyala.
 */
export function drawVendingLights(
    ctx: CanvasRenderingContext2D,
    cx: number,
    ty: number,
    color: VendingColor,
    lightOn: boolean,
): void {
    const [front] = BODY[color];
    const ox = cx + 1;
    const L = (i: number, d: number, col: string, w = 1, hh = 1) =>
        leftDot(ctx, ox, ty, B, VENDING_HEIGHT, i, d, col, w, hh);

    L(1, 3, lightOn ? C(11) : C(4), A - 2, 9);
    L(3, 5, front, A - 6, 1);
    L(3, 9, front, A - 6, 1);
    leftText(ctx, ox, ty, B, VENDING_HEIGHT, 6, 5, 'MINUM', C(1));
    L(3, 16, lightOn ? C(11) : C(4), 17, 1);
}

/** Satu vending machine dengan puncak tile di (cx, ty). */
export function drawVending(
    ctx: CanvasRenderingContext2D,
    cx: number,
    ty: number,
    color: VendingColor,
    fill: RackFill,
    lightOn: boolean,
): void {
    const [front, side] = BODY[color];
    const ox = cx + 1;
    const L = (i: number, d: number, col: string, w = 1, hh = 1) =>
        leftDot(ctx, ox, ty, B, VENDING_HEIGHT, i, d, col, w, hh);

    isoBox(ctx, ox, ty, A, B, VENDING_HEIGHT, C(5), front, side);

    for (let i = 0; i < A; i++) {
        L(i, 0, C(1));
    }

    // Bingkai dan kaca.
    L(2, 15, C(1), 19, 1);
    L(2, 56, C(1), 19, 1);
    L(2, 15, C(1), 1, 42);
    L(20, 15, C(1), 1, 42);
    L(3, 16, C(18), 17, 40);
    drawVendingLights(ctx, cx, ty, color, lightOn);

    // Lima baris rak dalam berisi botol: tutup terang, badan berwarna, sisi gelap.
    const perRow = BOTTLES_PER_ROW[fill];

    for (let row = 0; row < 5; row++) {
        const d = 18 + row * 8;
        L(3, d + 6, C(3), 17, 1); // rak dalam

        for (let c = 0; c < perRow; c++) {
            const bottle = BOTTLES[(row + c + color) % BOTTLES.length];
            const i = 4 + c * 3;
            L(i, d, C(4), 1, 1); // tutup
            L(i, d + 1, bottle, 2, 5); // badan
            L(i + 1, d + 1, C(1), 1, 1); // leher (bayangan)
            L(i, d + 3, C(4), 1, 1); // label
        }
    }

    for (let k = 0; k < 6; k++) {
        L(14 + k, 20 + k * 2, C(4)); // pantulan kaca
    }

    // Panel tombol, layar harga, tombol, lubang koin dan uang kertas.
    L(22, 16, C(2), 6, 30);
    L(23, 18, C(1), 4, 4);
    L(23, 19, lightOn ? C(9) : C(10), 3, 2);

    for (let r = 0; r < 5; r++) {
        L(23, 25 + r * 3, C(11), 1, 1);
        L(25, 25 + r * 3, C(11), 1, 1);
    }

    L(23, 41, C(3), 3, 1);
    L(23, 43, C(1), 4, 1);

    // Pintu ambil dan pelat bawah.
    L(4, 60, C(1), 15, 9);
    L(5, 61, C(2), 13, 7);
    L(6, 62, C(3), 11, 1);
    L(0, 71, C(2), A, 5);

    // Garis di sisi kanan.
    for (let j = 3; j < 6; j++) {
        rightDot(
            ctx,
            ox,
            ty,
            A,
            B,
            VENDING_HEIGHT,
            j,
            2,
            front,
            1,
            VENDING_HEIGHT - 4,
        );
    }

    for (let j = 10; j < 18; j += 2) {
        rightDot(
            ctx,
            ox,
            ty,
            A,
            B,
            VENDING_HEIGHT,
            j,
            VENDING_HEIGHT - 10,
            C(1),
            1,
            5,
        );
    }
}
