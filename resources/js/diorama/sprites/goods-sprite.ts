/**
 * Barang bawaan, kantong belanja, dan koin (Tahap 5C elemen 4). Hanya palet 24.
 *
 * - Kotak barang kecil berwarna sesuai produk: warna dipilih dari nama produk,
 *   jadi produk yang sama selalu berwarna sama (di tangan dan di scanner).
 * - Kantong belanja kertas dengan tali dan logo daun koperasi.
 * - Koin berputar 4 bingkai (muka, miring, tepi, miring) saat terbang ke meja.
 * - Lintasan melengkung untuk barang dari rak, kantong dari meja, koin ke laci.
 */
import { isoBox } from '../render/pixel';
import { C } from './palette';
import { createMatrix, mirror, stamp } from './pixels';
import type { Legend, PixelMatrix } from './pixels';

export type GoodsColors = readonly [body: string, dark: string];

/** Pasangan warna barang [badan, sisi gelap], sama dengan barang di rak. */
export const PRODUCT_COLORS: readonly GoodsColors[] = [
    [C(14), C(15)],
    [C(12), C(13)],
    [C(9), C(10)],
    [C(18), C(19)],
    [C(16), C(14)],
    [C(17), C(3)],
    [C(11), C(12)],
];

/** Warna kotak untuk nama produk (tetap untuk nama yang sama). */
export function productColor(name: string): GoodsColors {
    // FNV-1a dengan pengaduk akhir: sebaran warna merata untuk nama yang mirip.
    let hash = 0x811c9dc5;

    for (const ch of name.trim().toLowerCase()) {
        hash ^= ch.charCodeAt(0);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }

    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x45d9f3b) >>> 0;
    hash ^= hash >>> 16;

    return PRODUCT_COLORS[(hash >>> 0) % PRODUCT_COLORS.length];
}

/** Kotak barang kecil (9 × 9 px) dengan tutup terang, berpijak di (x, y). */
export function drawItemBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    [body, dark]: GoodsColors,
): void {
    isoBox(ctx, x, y - 2, 5, 4, 5, C(4), body, dark);
}

// ---- Kantong belanja ----------------------------------------------------------

/** Kantong kertas 9 × 11: O garis, K/k kertas terang/gelap, G/g logo daun. */
const BAG = [
    '...OOO...',
    '..O...O..',
    '..O...O..',
    'OOOOOOOOO',
    'OKKKKKKkO',
    'OKKKGKKkO',
    'OKKGgGKkO',
    'OKKKGKKkO',
    'OKKKKKKkO',
    'OKKKKKKkO',
    'OOOOOOOOO',
];
const BAG_LEGEND: Legend = { O: C(20), K: C(7), k: C(8), G: C(10), g: C(9) };

export const BAG_SIZE = { width: 9, height: 11 } as const;

export function bagMatrix(): PixelMatrix {
    const m = createMatrix(BAG_SIZE.width, BAG_SIZE.height);
    stamp(m, BAG, BAG_LEGEND, 0, 0);

    return m;
}

// ---- Koin -----------------------------------------------------------------------

/** Y kunyit, y kilau, D tepi gelap. */
const COIN_LEGEND: Legend = { Y: C(12), y: C(11), D: C(13) };
const COIN_FACE = ['.DDD.', 'DyYYD', 'DYyYD', 'DYYYD', '.DDD.'];
const COIN_TILT = ['.DD.', 'DyYD', 'DYYD', 'DYYD', '.DD.'];
const COIN_EDGE = ['DD', 'yD', 'YD', 'YD', 'DD'];

export const COIN_FRAMES = 4;
/** Putaran per detik (bingkai). */
export const COIN_SPIN = 12;

export function coinMatrix(frame: number): PixelMatrix {
    const f = ((frame % COIN_FRAMES) + COIN_FRAMES) % COIN_FRAMES;
    const grid = f === 0 ? COIN_FACE : f === 2 ? COIN_EDGE : COIN_TILT;
    const m = createMatrix(grid[0].length, grid.length);
    stamp(m, grid, COIN_LEGEND, 0, 0);

    return f === 3 ? mirror(m) : m;
}

// ---- Lintasan ---------------------------------------------------------------------

export type Point = { x: number; y: number };

/** Titik pada lintasan melengkung dari `from` ke `to` (t 0..1), puncak `height` px. */
export function arcPoint(
    from: Point,
    to: Point,
    t: number,
    height: number,
): Point {
    const p = Math.max(0, Math.min(1, t));

    return {
        x: Math.round(from.x + (to.x - from.x) * p),
        y: Math.round(
            from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * height,
        ),
    };
}

/**
 * Letak tangan dari titik pijak: ke arah hadap, setinggi pinggang.
 * Pelanggan buatan kode: tangan di sisi badan (±9 px, 19 px di atas kaki).
 * Karakter referensi: menurut ukuran gambarnya.
 */
export function handOffset(
    size: { width: number; height: number } | null,
    left: boolean,
): Point {
    const side = left ? -1 : 1;

    if (!size) {
        return { x: side * 9, y: -19 };
    }

    return {
        x: side * Math.max(6, Math.round(size.width * 0.35)),
        y: -Math.round(size.height * 0.42),
    };
}
