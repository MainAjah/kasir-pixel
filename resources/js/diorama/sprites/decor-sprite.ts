/**
 * Hiasan (Tahap 5C elemen 5): tanaman pot, jam dinding, jendela, empat lukisan,
 * dan dua lampu dinding. Bentuk dari rancangan 5A yang disetujui; tiga warna 5A
 * yang di luar palet diganti warna palet. Hanya palet 24 warna.
 *
 * Waktu (siang, senja, malam) mengubah langit di jendela, jarum jam, dan lampu.
 * Lapisan malam sendiri ada di renderer (rancangan bagian 8).
 */
import { HALF_H, HALF_W, tileTop } from '../engine/iso';
import { isoBox, leftDot, onTop, rightDot } from '../render/pixel';
import { C } from './palette';
import { createMatrix, setPixel } from './pixels';
import type { PixelMatrix } from './pixels';

export type TimeOfDay = 'siang' | 'senja' | 'malam';
export const TIMES_OF_DAY: readonly TimeOfDay[] = ['siang', 'senja', 'malam'];

/** Kekuatan lapisan malam (0 = siang). */
export const NIGHT_STRENGTH: Record<TimeOfDay, number> = {
    siang: 0,
    senja: 0.5,
    malam: 1,
};

/** Jam yang ditunjukkan jam dinding untuk tiap waktu (sampai jam browser dipakai di 5D). */
export const CLOCK_TIME: Record<TimeOfDay, [number, number]> = {
    siang: [10, 10],
    senja: [17, 40],
    malam: [21, 0],
};

const fl = Math.floor;
const inCircle = (x: number, y: number, cx: number, cy: number, r: number) =>
    (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

/** Gambar berbingkai kayu dengan list emas; `paint` mengisi bagian dalam. */
export function framed(
    w: number,
    h: number,
    paint: (x: number, y: number, iw: number, ih: number) => string,
): PixelMatrix {
    const m = createMatrix(w, h);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
            const trim = x === 1 || y === 1 || x === w - 2 || y === h - 2;
            setPixel(
                m,
                x,
                y,
                edge ? C(20) : trim ? C(12) : paint(x - 2, y - 2, w - 4, h - 4),
            );
        }
    }

    return m;
}

// ---- Lukisan ---------------------------------------------------------------------

export type PaintingKey = 'gunung' | 'laut' | 'buah' | 'bunga';

export const PAINTINGS: Record<PaintingKey, () => PixelMatrix> = {
    // Gunung dan sawah.
    gunung: () =>
        framed(26, 20, (x, y, w, h) => {
            if (inCircle(x, y, 17, 3, 2)) {
                return C(12);
            }

            const peak1 = 9 - Math.abs(x - 7) * 0.9;
            const peak2 = 8 - Math.abs(x - 15) * 0.8;
            const mountain = Math.max(peak1, peak2);

            if (y >= h - 5) {
                return (x + y) % 3 === 0 ? C(10) : C(9); // sawah
            }

            if (h - 5 - y <= mountain) {
                if (h - 5 - y > mountain - 2 && mountain > 6) {
                    return C(4); // puncak bersalju
                }

                return peak1 > peak2 ? C(10) : C(9);
            }

            return y < 3 ? C(18) : y < 6 ? ((x + y) % 2 ? C(18) : C(4)) : C(4);
        }),
    // Laut senja.
    laut: () =>
        framed(26, 18, (x, y) => {
            if (y < 7 && inCircle(x, y, 11, 7, 4)) {
                return C(11);
            }

            if (y < 3) {
                return C(16);
            }

            if (y < 5) {
                return C(13);
            }

            if (y < 7) {
                return C(12);
            }

            return (x + y * 3) % 7 === 0 ? C(4) : y < 10 ? C(18) : C(19);
        }),
    // Buah di mangkuk.
    buah: () =>
        framed(22, 20, (x, y, w, h) => {
            if (y >= h - 3) {
                return C(20);
            }

            if (inCircle(x, y, 6, 8, 3)) {
                return C(12);
            }

            if (inCircle(x, y, 11, 7, 3)) {
                return C(14);
            }

            if (inCircle(x, y, 14, 10, 2)) {
                return C(9);
            }

            if (y >= 10 && y <= 13 && Math.abs(x - 9) <= 8 - (y - 10)) {
                return y === 10 ? C(4) : C(19);
            }

            return C(17);
        }),
    // Bunga dalam vas.
    bunga: () =>
        framed(18, 22, (x, y) => {
            if (y >= 12 && Math.abs(x - 7) <= 3 - (y > 16 ? 1 : 0)) {
                return y === 12 ? C(4) : C(19);
            }

            if (inCircle(x, y, 4, 4, 2)) {
                return C(14);
            }

            if (inCircle(x, y, 9, 3, 2)) {
                return C(16);
            }

            if (inCircle(x, y, 11, 7, 2)) {
                return C(12);
            }

            if (
                (x === 5 && y > 5 && y < 12) ||
                (x === 8 && y > 4 && y < 12) ||
                (x === 10 && y > 8 && y < 12)
            ) {
                return C(10);
            }

            if ((x === 6 && y === 9) || (x === 9 && y === 8)) {
                return C(9);
            }

            return C(5);
        }),
};

// ---- Jendela ------------------------------------------------------------------------

/** Batas atas siluet pepohonan di jendela malam, per kolom bagian dalam (22 kolom). */
const TREELINE = [
    20, 19, 19, 20, 21, 20, 19, 18, 19, 20, 21, 21, 20, 19, 19, 20, 21, 20, 19,
    19, 20, 21,
];

/** Bintang di jendela malam: kuning lampu (terang) dan sorotan (kecil), tersebar acak tetap. */
const STARS = new Map<string, string>([
    ...[
        [7, 1],
        [3, 6],
        [13, 13],
        [20, 9],
        [8, 16],
    ].map(([x, y]): [string, string] => [`${x},${y}`, C(11)]),
    ...[
        [1, 1],
        [5, 3],
        [8, 8],
        [2, 9],
        [13, 2],
        [16, 9],
        [20, 14],
        [15, 16],
        [5, 14],
        [1, 16],
        [12, 6],
        [18, 12],
    ].map(([x, y]): [string, string] => [`${x},${y}`, C(4)]),
]);

/** Jendela 26 × 28 berkusen silang: siang (langit, awan, pohon), senja, malam berbintang. */
export function windowMatrix(time: TimeOfDay): PixelMatrix {
    const m = framed(26, 28, (x, y) => {
        if (time === 'malam') {
            if (y >= TREELINE[x]) {
                return C(1); // siluet pepohonan (sama dengan pintu)
            }

            if (inCircle(x, y, 17, 4, 3.2) && !inCircle(x, y, 18.6, 3, 2.8)) {
                return C(11); // bulan sabit
            }

            const star = STARS.get(`${x},${y}`);

            return star ?? C(24);
        }

        if (time === 'senja') {
            if (y > 18) {
                return (x + y) % 4 === 0 ? C(10) : C(20); // pohon dalam bayangan
            }

            if (inCircle(x, y, 6, 16, 3)) {
                return C(11); // matahari terbenam
            }

            return y < 5 ? C(17) : y < 10 ? C(16) : y < 14 ? C(14) : C(13);
        }

        if (y > 17 && (x + y) % 4 === 0) {
            return C(9);
        }

        if (y > 18) {
            return C(10);
        }

        if (inCircle(x, y, 6, 6, 2) || inCircle(x, y, 8, 5, 2)) {
            return C(4); // awan
        }

        return C(18);
    });

    // Kusen tengah: tegak dan mendatar.
    for (let y = 0; y < m.height; y++) {
        setPixel(m, 12, y, C(20));
        setPixel(m, 13, y, C(20));
    }

    for (let x = 0; x < m.width; x++) {
        setPixel(m, x, 13, C(20));
    }

    return m;
}

/**
 * Hanya kaca jendela, tanpa bingkai dan kusen: digambar ulang terang di atas
 * lapisan malam (langit di luar tetap terang), kayunya tetap redup.
 */
export function windowGlass(time: TimeOfDay): PixelMatrix {
    const m = windowMatrix(time);
    const glass = createMatrix(m.width, m.height);

    for (let y = 2; y < m.height - 2; y++) {
        for (let x = 2; x < m.width - 2; x++) {
            if (x !== 12 && x !== 13 && y !== 13) {
                setPixel(glass, x, y, m.pixels[y * m.width + x]);
            }
        }
    }

    return glass;
}

// ---- Pemandangan di balik pintu kaca --------------------------------------------------

/** Tinggi kaca pintu (px) dan baris mulai trotoar. */
export const DOOR_GLASS_H = 70;
const DOOR_GROUND = 54;

/** Puncak tajuk pohon di luar pintu untuk kolom u (bergelombang, tetap). */
function crownTop(u: number): number {
    return 41 + Math.round(2.5 * Math.cos(u * 0.6) + 1.5 * Math.cos(u * 0.23));
}

/** Bintang di langit luar pintu: tersebar acak tetap. */
function doorStar(u: number, v: number): string | null {
    const h = (u * 37 + v * 91 + u * v * 7) % 97;

    return h === 0 ? C(11) : h === 13 ? C(4) : null;
}

/**
 * Warna pemandangan di balik pintu kaca: u = kolom dari kiri pintu (0..63),
 * v = baris dari atas kaca (0..69). Langit, pepohonan, rumput, dan trotoar,
 * menurut waktu: siang (langit biru berawan), senja (langit jingga dan matahari
 * terbenam), malam (langit biru malam berbintang dan siluet pohon).
 */
export function doorViewColor(u: number, v: number, time: TimeOfDay): string {
    const tree = v >= crownTop(u) && v < DOOR_GROUND;
    const dither = (u + v) % 4 === 0;

    if (v >= DOOR_GROUND) {
        const row = v - DOOR_GROUND;
        const grass = row < 2;
        const grout =
            !grass && (row % 5 === 2 || (u + (fl(row / 5) % 2) * 4) % 8 === 0);

        if (time === 'malam') {
            return grass || grout ? C(1) : C(2);
        }

        if (time === 'senja') {
            return grass ? C(10) : grout ? C(20) : C(8);
        }

        return grass ? C(9) : grout ? C(7) : C(6);
    }

    if (time === 'malam') {
        if (tree) {
            return C(1);
        }

        return doorStar(u, v) ?? C(24);
    }

    if (time === 'senja') {
        if (tree) {
            return dither ? C(10) : C(20);
        }

        if (inCircle(u, v, 40, 42, 6)) {
            return C(11); // matahari terbenam di balik pepohonan
        }

        return v < 12 ? C(17) : v < 24 ? C(16) : v < 34 ? C(14) : C(13);
    }

    if (tree) {
        return dither ? C(9) : C(10);
    }

    if (
        inCircle(u, v, 14, 10, 3) ||
        inCircle(u, v, 18, 9, 3) ||
        inCircle(u, v, 46, 18, 3) ||
        inCircle(u, v, 50, 17, 2)
    ) {
        return C(4); // awan
    }

    return C(18);
}

// ---- Jam dinding ----------------------------------------------------------------------

/**
 * Jam bundar 12 × 12: bingkai kayu, list kunyit, muka krem dengan tanda 12-3-6-9,
 * jarum jam pendek dan jarum menit panjang menurut waktu.
 */
export function clockMatrix(hours: number, minutes: number): PixelMatrix {
    const m = createMatrix(12, 12);
    const cx = 5.5;
    const cy = 5.5;

    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 12; x++) {
            const d = Math.hypot(x + 0.5 - 6, y + 0.5 - 6);

            if (d <= 6) {
                setPixel(m, x, y, d > 5 ? C(20) : d > 4.2 ? C(12) : C(4));
            }
        }
    }

    for (const [x, y] of [
        [5, 2],
        [9, 5],
        [5, 9],
        [2, 5],
    ]) {
        setPixel(m, x, y, C(3));
    }

    const hand = (angle: number, length: number, color: string) => {
        for (let r = 0; r <= length; r += 0.5) {
            setPixel(
                m,
                Math.round(cx + Math.sin(angle) * r - 0.01),
                Math.round(cy - Math.cos(angle) * r - 0.01),
                color,
            );
        }
    };

    hand(((minutes % 60) / 60) * Math.PI * 2, 3.5, C(1));
    hand((((hours % 12) + minutes / 60) / 12) * Math.PI * 2, 2.2, C(15));
    setPixel(m, 5, 5, C(15));

    return m;
}

// ---- Lampu dinding --------------------------------------------------------------------------

/** Lampu dinding 7 × 9: dudukan kayu, kap kunyit, bola lampu menyala (kuning) atau mati (krem). */
export function lampMatrix(on: boolean): PixelMatrix {
    const m = createMatrix(7, 9);
    const rows = [
        '...O...',
        '...O...',
        '..OOO..',
        '.OSSSO.',
        'OSSSSsO',
        'OOOOOOO',
        '..LLL..',
        '..LLL..',
        '...L...',
    ];
    const colors: Record<string, string> = {
        O: C(20),
        S: C(12),
        s: C(13),
        L: on ? C(11) : C(5),
    };

    rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const color = colors[row[x]];

            if (color) {
                setPixel(m, x, y, color);
            }
        }
    });

    return m;
}

// ---- Letak di dinding -------------------------------------------------------------------------

export type WallSide = 'kanan' | 'kiri';

export type WallDecor = {
    key: string;
    side: WallSide;
    /** gx (dinding kanan) atau gy (dinding kiri). */
    tile: number;
    /** Geser sepanjang dinding (px) dari ujung tile. */
    offset: number;
    /** Tinggi tepi atas dari lantai (px). */
    top: number;
};

/** Letak hiasan dinding, sama dengan rancangan 5A (lampu baru di 5C). */
export const WALL_DECOR: readonly WallDecor[] = [
    { key: 'lukisan-gunung', side: 'kanan', tile: 1, offset: 2, top: 62 },
    { key: 'lukisan-laut', side: 'kanan', tile: 3, offset: 6, top: 60 },
    { key: 'jam', side: 'kanan', tile: 5, offset: 10, top: 70 },
    { key: 'lampu-kanan', side: 'kanan', tile: 6, offset: 12, top: 66 },
    { key: 'jendela', side: 'kanan', tile: 11, offset: 3, top: 66 },
    { key: 'lukisan-buah', side: 'kiri', tile: 1, offset: 4, top: 60 },
    { key: 'lukisan-bunga', side: 'kiri', tile: 3, offset: 6, top: 62 },
    { key: 'lampu-kiri', side: 'kiri', tile: 5, offset: 12, top: 66 },
];

/** Tempel gambar di dinding, miring mengikuti dinding (dinding kanan turun ke kanan, kiri naik ke kanan). */
export function hangOnWall(
    ctx: CanvasRenderingContext2D,
    m: PixelMatrix,
    decor: WallDecor,
): void {
    const { x: cx, y: ty } =
        decor.side === 'kanan'
            ? tileTop(decor.tile, 0)
            : tileTop(0, decor.tile);

    for (let r = 0; r < m.height; r++) {
        for (let c = 0; c < m.width; c++) {
            const color = m.pixels[r * m.width + c];

            if (!color) {
                continue;
            }

            const i = decor.offset + c;
            ctx.fillStyle = color;

            if (decor.side === 'kanan') {
                ctx.fillRect(cx + i, ty + fl(i / 2) - decor.top + r, 1, 1);
            } else {
                ctx.fillRect(
                    cx - HALF_W + i,
                    ty + HALF_H - fl(i / 2) - decor.top + r,
                    1,
                    1,
                );
            }
        }
    }
}

/** Titik tengah hiasan di dinding (untuk cahaya lampu). */
export function wallDecorCenter(
    decor: WallDecor,
    w: number,
    h: number,
): { x: number; y: number } {
    const { x: cx, y: ty } =
        decor.side === 'kanan'
            ? tileTop(decor.tile, 0)
            : tileTop(0, decor.tile);
    const i = decor.offset + fl(w / 2);

    return decor.side === 'kanan'
        ? { x: cx + i, y: ty + fl(i / 2) - decor.top + fl(h / 2) }
        : {
              x: cx - HALF_W + i,
              y: ty + HALF_H - fl(i / 2) - decor.top + fl(h / 2),
          };
}

// ---- Tanaman pot --------------------------------------------------------------------------

/** Tanaman pot dari rancangan 5A: pot terakota berbibir kunyit, daun berlapis dua warna. */
export function drawPlant(
    ctx: CanvasRenderingContext2D,
    cx: number,
    ty: number,
): void {
    const [ox, oy] = onTop(cx, ty, 0, 10, 10);
    isoBox(ctx, ox, oy, 12, 12, 10, C(20), C(14), C(15));
    leftDot(ctx, ox, oy, 12, 10, 0, 0, C(13), 12, 1);
    // Bibir kanan dua baris supaya celah tangga di tepi kanan atas ikut tertutup.
    rightDot(ctx, ox, oy, 12, 12, 10, 0, -1, C(13), 12, 2);

    /** Daun runcing: lebar 3 di pangkal, 1 di ujung, condong `lean` piksel. */
    const leaf = (
        x: number,
        y: number,
        len: number,
        lean: number,
        color: string,
    ) => {
        ctx.fillStyle = color;

        for (let k = 0; k < len; k++) {
            const w = Math.max(1, Math.round(3 * (1 - k / len)));
            ctx.fillRect(
                x + Math.round((lean * k) / len) - fl(w / 2),
                y - k,
                w,
                1,
            );
        }
    };

    /** Rumpun daun bulat lonjong. */
    const blob = (
        x: number,
        y: number,
        rx: number,
        ry: number,
        color: string,
    ) => {
        ctx.fillStyle = color;

        for (let dy = -ry; dy <= ry; dy++) {
            const half = Math.round(rx * Math.sqrt(1 - (dy / (ry + 0.5)) ** 2));
            ctx.fillRect(x - half, y + dy, half * 2 + 1, 1);
        }
    };

    // Belakang: ujung daun tua yang mencuat dan rumpun gelap yang menutupi tanah.
    leaf(ox - 9, oy - 8, 5, -2, C(10));
    leaf(ox + 9, oy - 8, 5, 2, C(10));
    leaf(ox - 4, oy - 15, 5, -3, C(10));
    leaf(ox + 1, oy - 16, 4, 1, C(10));
    leaf(ox + 6, oy - 13, 4, 3, C(10));
    blob(ox - 5, oy - 7, 5, 4, C(10));
    blob(ox + 5, oy - 7, 5, 4, C(10));
    blob(ox, oy - 12, 6, 5, C(10));
    blob(ox, oy - 5, 6, 3, C(10));

    // Depan: daun muda terang dan kilau.
    blob(ox - 4, oy - 8, 3, 2, C(9));
    blob(ox + 4, oy - 9, 3, 2, C(9));
    blob(ox - 1, oy - 13, 3, 2, C(9));
    blob(ox + 2, oy - 5, 2, 1, C(9));
    ctx.fillStyle = C(4);
    ctx.fillRect(ox - 5, oy - 9, 1, 1);
    ctx.fillRect(ox + 3, oy - 10, 1, 1);
    ctx.fillRect(ox - 2, oy - 14, 1, 1);
}
