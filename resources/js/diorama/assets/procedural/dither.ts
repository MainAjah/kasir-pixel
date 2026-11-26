/**
 * Dither berurutan Bayer 4×4 dan tangga nada (Tahap 5H): peralihan antara dua
 * warna palet tanpa warna campuran, sehingga tekstur tetap berpalet.
 */

export const BAYER4: readonly (readonly number[])[] = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
];

/** Ambang Bayer di (x, y), (0, 1). */
export function bayer(x: number, y: number): number {
    return (BAYER4[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16;
}

/** true bila piksel (x, y) memakai warna kedua untuk campuran `t` (0 = semua pertama, 1 = semua kedua). */
export function ditherMix(x: number, y: number, t: number): boolean {
    return t > bayer(x, y);
}

/** Warna di tangga nada, indeks dijepit ke ujung tangga. */
export function step<T>(ramp: readonly T[], index: number): T {
    return ramp[Math.max(0, Math.min(ramp.length - 1, index))];
}
