/**
 * Derau berbenih untuk generator tekstur (Tahap 5H). Murni dan deterministik:
 * benih dan koordinat yang sama selalu memberi angka yang sama.
 */

/** Angka acak [0, 1) dari benih dan dua koordinat bulat (hash integer). */
export function hash2(seed: number, x: number, y: number): number {
    let h =
        (seed | 0) ^
        Math.imul(x | 0, 0x27d4eb2d) ^
        Math.imul(y | 0, 0x165667b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;

    return (h >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Value noise 2D [0, 1): nilai acak di titik kisi berjarak `cell`, diinterpolasi halus. */
export function valueNoise(
    seed: number,
    x: number,
    y: number,
    cell: number,
): number {
    const gx = x / cell;
    const gy = y / cell;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = smooth(gx - x0);
    const ty = smooth(gy - y0);
    const a = hash2(seed, x0, y0);
    const b = hash2(seed, x0 + 1, y0);
    const c = hash2(seed, x0, y0 + 1);
    const d = hash2(seed, x0 + 1, y0 + 1);
    const top = a + (b - a) * tx;
    const bottom = c + (d - c) * tx;

    return top + (bottom - top) * ty;
}

/** Value noise 1D [0, 1) sepanjang satu sumbu (serat kayu). */
export function valueNoise1(seed: number, x: number, cell: number): number {
    return valueNoise(seed, x, 0, cell);
}
