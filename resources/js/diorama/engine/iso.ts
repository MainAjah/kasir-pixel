/**
 * Proyeksi isometrik 2:1 diorama (docs/diorama-rancangan.md bagian 1).
 *
 * Kanvas dasar 768 × 480, tile belah ketupat 64 × 32, grid toko 12 × 9.
 * Asal (ORIGIN) adalah puncak belah ketupat tile (0,0), yaitu pojok belakang toko.
 * Tahap 5F: tinggi 432 → 480 supaya alas tebal dan bayangan jatuh balok toko
 * muat di bawah lantai; ORIGIN tetap, jadi semua posisi lama tidak berubah.
 * (Dicoba 464 dengan alas 17 px: skala hanya naik 3,4%, jadi tetap 480.)
 */
export const CANVAS_W = 768;
export const CANVAS_H = 480;
export const TILE_W = 64;
export const TILE_H = 32;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;
export const WALL_H = 80;
export const ORIGIN = { x: 336, y: 88 } as const;

export type Tile = { gx: number; gy: number };
export type Point = { x: number; y: number };

/** Arah hadap menurut langkah di grid: +gx kanan-bawah, −gx kiri-atas, +gy kiri-bawah, −gy kanan-atas. */
export type Facing = 'se' | 'nw' | 'sw' | 'ne';

/** Puncak belah ketupat tile, di-pixel-snap. Boleh pecahan (aktor yang sedang berjalan). */
export function tileTop(gx: number, gy: number): Point {
    return {
        x: Math.round(ORIGIN.x + (gx - gy) * HALF_W),
        y: Math.round(ORIGIN.y + (gx + gy) * HALF_H),
    };
}

/** Titik pijak di tengah tile, di-pixel-snap. */
export function tileCenter(gx: number, gy: number): Point {
    return {
        x: Math.round(ORIGIN.x + (gx - gy) * HALF_W),
        y: Math.round(ORIGIN.y + (gx + gy) * HALF_H + HALF_H),
    };
}

/** Kunci kedalaman: makin besar makin dekat ke penonton, digambar belakangan. */
export function depthOf(gx: number, gy: number): number {
    return gx + gy;
}

export function facingOf(dx: number, dy: number, fallback: Facing): Facing {
    if (dx > 0) {
        return 'se';
    }

    if (dx < 0) {
        return 'nw';
    }

    if (dy > 0) {
        return 'sw';
    }

    if (dy < 0) {
        return 'ne';
    }

    return fallback;
}

export function sameTile(a: Tile, b: Tile): boolean {
    return a.gx === b.gx && a.gy === b.gy;
}

export function tileKey(gx: number, gy: number): string {
    return `${gx},${gy}`;
}
