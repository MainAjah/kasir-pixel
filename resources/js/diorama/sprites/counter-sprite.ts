/**
 * Meja kasir, komputer, scanner, layar mini, dan bangku (Tahap 5C elemen 2).
 *
 * Bentuknya dipindahkan dari rancangan 5A yang disetujui. Tiap meja dua tile:
 * - potongan kiri: monitor kasir dilihat dari belakang (ventilasi, lampu daya),
 *   keyboard bertuts, scanner datar tertanam dengan garis laser, scanner genggam;
 * - potongan kanan: laci uang, printer struk, kantong terlipat, layar mini
 *   menghadap pembeli.
 * Kasir 2 tutup: komputer mati, layar bertuliskan "TUTUP".
 *
 * Bagian yang hidup mengikuti keadaan (CounterLook): laser berkedip dan barang
 * meluncur di atas kaca saat memindai, LED scanner "bip", struk keluar saat
 * membayar, layar mini menampilkan total harian (hijau) atau total belanja
 * (kuning) saat membayar. Hanya palet 24 warna.
 */
import {
    isoBox,
    leftDot,
    leftText,
    onTop,
    rightDot,
    topDot,
} from '../render/pixel';
import { formatRupiah } from '../render/pixel';
import { C } from './palette';

export const COUNTER_HEIGHT = 28;
const T = 32;

export type CounterLook = {
    /** Kasir menyala (kasir 1) atau tutup (kasir 2). */
    on: boolean;
    /** Sedang memindai: 0..1 kemajuan satu pindai, null bila tidak. */
    scan: number | null;
    /** LED scanner genggam menyala hijau ("bip" berhasil). */
    beep: boolean;
    /** Struk keluar dari printer: 0..1 panjangnya, null bila tidak. */
    receipt: number | null;
    /** Isi layar mini. */
    display: { text: string; mode: 'harian' | 'belanja' };
};

export const IDLE_COUNTER: CounterLook = {
    on: true,
    scan: null,
    beep: false,
    receipt: null,
    display: { text: '0', mode: 'harian' },
};

/**
 * Angka untuk layar mini (paling banyak 7 karakter): 113.000, 999.999,
 * lalu 1,2JT, 12,5JT, 125JT untuk jutaan.
 */
export function formatDisplay(value: number): string {
    const n = Math.max(0, Math.round(value));

    if (n < 1_000_000) {
        return formatRupiah(n);
    }

    const millions = n / 1_000_000;

    if (millions >= 100) {
        return `${Math.floor(millions)}JT`;
    }

    return `${(Math.floor(millions * 10) / 10).toString().replace('.', ',')}JT`;
}

/** Badan meja: atas putih, sisi depan kunyit berpanel, plint gelap. */
function drawDesk(ctx: CanvasRenderingContext2D, cx: number, ty: number): void {
    const h = COUNTER_HEIGHT;
    isoBox(ctx, cx, ty, T, T, h, C(4), C(12), C(13));

    for (let i = 0; i < T; i++) {
        leftDot(ctx, cx, ty, T, h, i, 0, C(3));
        leftDot(ctx, cx, ty, T, h, i, h - 3, C(2), 1, 4);
    }

    for (let i = 4; i < T; i += 8) {
        leftDot(ctx, cx, ty, T, h, i, 3, C(13), 1, h - 7); // panel depan
    }

    for (let j = 0; j < T; j++) {
        rightDot(ctx, cx, ty, T, T, h, j, h - 3, C(2), 1, 4);
    }
}

/** Potongan kiri: monitor, keyboard, scanner datar, scanner genggam. */
function drawLeftPart(
    ctx: CanvasRenderingContext2D,
    cx: number,
    ty: number,
    look: CounterLook,
): void {
    const at = (u: number, v: number) => onTop(cx, ty, COUNTER_HEIGHT, u, v);

    // Monitor kasir menghadap penjaga (kita melihat punggungnya), di atas penyangga.
    let [ox, oy] = at(12, 4);
    isoBox(ctx, ox, oy, 4, 4, 4, C(3), C(2), C(1));
    [ox, oy] = at(5, 6);
    isoBox(ctx, ox, oy - 4, 17, 3, 13, C(2), C(2), C(1));

    for (let i = 2; i < 15; i += 3) {
        leftDot(ctx, ox, oy - 4, 3, 13, i, 3, C(1), 1, 4); // ventilasi
    }

    leftDot(ctx, ox, oy - 4, 3, 13, 8, 9, look.on ? C(9) : C(3), 2, 1); // lampu daya

    // Keyboard dengan tuts.
    [ox, oy] = at(5, 12);
    isoBox(ctx, ox, oy, 16, 6, 2, C(3), C(2), C(1));

    for (let i = 1; i < 15; i += 2) {
        for (let j = 1; j < 5; j += 2) {
            topDot(ctx, ox, oy, 2, i, j, C(4));
        }
    }

    // Scanner datar tertanam di meja: kaca gelap berbingkai. Di belakang, sebelah
    // kanan monitor dan tepat di depan penjaga, supaya tidak tertutup layar mini.
    [ox, oy] = at(23, 1);

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 10; j++) {
            topDot(ctx, ox, oy, 0, i, j, j === 0 || i === 0 ? C(3) : C(1));
        }
    }

    if (look.on) {
        // Laser: redup saat diam, terang dan berkedip saat memindai.
        const scanning = look.scan !== null;
        const bright = scanning && Math.floor((look.scan ?? 0) * 8) % 2 === 0;

        for (let i = 1; i < 8; i++) {
            topDot(ctx, ox, oy, 0, i, 5, scanning ? C(14) : C(15));

            if (bright) {
                topDot(ctx, ox, oy, 0, i, 4, C(16));
                topDot(ctx, ox, oy, 0, i, 6, C(16));
            }
        }

        // Barang kecil meluncur melintasi kaca selama satu pindai; garis laser
        // melintang di muka barang saat berkedip terang.
        if (scanning) {
            const v = Math.round((look.scan ?? 0) * 9);
            const [bx, by] = onTop(ox, oy, 0, 2, v);
            isoBox(ctx, bx, by, 4, 3, 3, C(11), C(12), C(13));

            if (bright) {
                leftDot(ctx, bx, by, 3, 3, 0, 1, C(14), 4, 1);
            }
        }
    }

    // Scanner genggam di dudukan, LED berkedip saat memindai, hijau saat "bip".
    [ox, oy] = at(24, 26);
    isoBox(ctx, ox, oy, 4, 4, 3, C(2), C(1), C(1));
    isoBox(ctx, ox, oy - 3, 3, 3, 6, C(2), C(2), C(1));
    const led = !look.on
        ? C(3)
        : look.beep
          ? C(9)
          : look.scan !== null && Math.floor(look.scan * 6) % 2 === 0
            ? C(16)
            : C(14);
    leftDot(ctx, ox, oy - 3, 3, 6, 0, 1, led, 2, 1);
}

/** Potongan kanan: laci uang, printer struk, kantong, layar mini. */
function drawRightPart(
    ctx: CanvasRenderingContext2D,
    cx: number,
    ty: number,
    look: CounterLook,
): void {
    const at = (u: number, v: number) => onTop(cx, ty, COUNTER_HEIGHT, u, v);

    // Laci uang dan printer struk di atasnya.
    let [ox, oy] = at(4, 3);
    isoBox(ctx, ox, oy, 20, 14, 5, C(2), C(1), C(1));
    leftDot(ctx, ox, oy, 14, 5, 8, 2, C(3), 5, 1);
    [ox, oy] = at(6, 4);
    isoBox(ctx, ox, oy - 5, 10, 9, 7, C(4), C(3), C(2));
    leftDot(ctx, ox, oy - 5, 9, 7, 2, 2, C(1), 6, 1);

    // Struk keluar dari celah depan printer ke arah pembeli (tidak menutupi wajah penjaga).
    if (look.on && look.receipt !== null) {
        const length = 1 + Math.round(look.receipt * 3);
        leftDot(ctx, ox, oy - 5, 9, 7, 3, 3, C(4), 4, length);

        if (length > 2) {
            leftDot(ctx, ox, oy - 5, 9, 7, 3, 4, C(3), 3, 1);
        }
    }

    // Kantong belanja terlipat.
    [ox, oy] = at(24, 6);
    isoBox(ctx, ox, oy, 6, 6, 4, C(5), C(6), C(8));

    // Layar mini menghadap pembeli (+gy), di atas tiang.
    [ox, oy] = at(15, 24);
    isoBox(ctx, ox, oy, 4, 4, 4, C(3), C(2), C(1));
    [ox, oy] = at(1, 25);
    isoBox(ctx, ox, oy - 4, 30, 3, 12, C(2), C(1), C(1));

    if (!look.on) {
        leftDot(ctx, ox, oy - 4, 3, 12, 1, 1, C(2), 28, 10);
        leftText(ctx, ox, oy - 4, 3, 12, 5, 4, 'TUTUP', C(3));

        for (let k = 0; k < 4; k++) {
            leftDot(ctx, ox, oy - 4, 3, 12, 20 + k, 2 + k, C(3)); // pantulan layar mati
        }

        return;
    }

    const paying = look.display.mode === 'belanja';
    leftDot(ctx, ox, oy - 4, 3, 12, 1, 1, paying ? C(11) : C(9), 28, 10);
    leftDot(ctx, ox, oy - 4, 3, 12, 1, 1, paying ? C(12) : C(10), 28, 2);
    // Rata kanan di layar selebar 28 piksel.
    const width = look.display.text
        .split('')
        .reduce((w, ch) => w + (ch === '.' || ch === ',' ? 2 : 4), 0);
    leftText(
        ctx,
        ox,
        oy - 4,
        3,
        12,
        Math.max(2, 29 - width),
        4,
        look.display.text,
        C(1),
    );
}

/** Satu potongan meja kasir (kiri atau kanan) di puncak tile (cx, ty). */
export function drawCounterSlice(
    ctx: CanvasRenderingContext2D,
    cx: number,
    ty: number,
    part: 'kiri' | 'kanan',
    look: CounterLook,
): void {
    drawDesk(ctx, cx, ty);

    if (part === 'kiri') {
        drawLeftPart(ctx, cx, ty, look);
    } else {
        drawRightPart(ctx, cx, ty, look);
    }
}

/** Bangku kasir 2: dudukan lavender, kaki logam. */
export function drawStool(
    ctx: CanvasRenderingContext2D,
    cx: number,
    ty: number,
): void {
    const [ox, oy] = onTop(cx, ty, 0, 10, 10);

    for (const [u, v] of [
        [1, 1],
        [9, 1],
        [1, 9],
        [9, 9],
    ]) {
        const [x, y] = onTop(ox, oy, 0, u, v);
        ctx.fillStyle = C(2);
        ctx.fillRect(x, y - 10, 1, 10);
    }

    isoBox(ctx, ox, oy - 10, 12, 12, 2, C(17), C(3), C(2));
}
