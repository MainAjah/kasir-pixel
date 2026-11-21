import { depthOf } from './iso';
import type { Tile } from './iso';

/**
 * Urutan gambar menurut kedalaman (docs/diorama-rancangan.md bagian 8).
 *
 * Lantai dan dinding digambar lebih dulu di luar daftar ini. Objek dan aktor
 * diurutkan menurut `gx + gy` titik pijak. Seri: perabot dulu, lalu aktor, lalu
 * efek; setelah itu `gx` kecil dulu. Efek memakai kedalaman pemiliknya + 0,1.
 */
export const LAYER = { furniture: 0, actor: 1, effect: 2 } as const;
export type Layer = (typeof LAYER)[keyof typeof LAYER];

export type DrawItem = {
    depth: number;
    layer: Layer;
    gx: number;
    /** Penanda untuk tes dan debug. */
    id: string;
    draw: (ctx: CanvasRenderingContext2D) => void;
};

export function compareDrawItems(
    a: Pick<DrawItem, 'depth' | 'layer' | 'gx'>,
    b: Pick<DrawItem, 'depth' | 'layer' | 'gx'>,
): number {
    return a.depth - b.depth || a.layer - b.layer || a.gx - b.gx;
}

export function sortDrawItems<
    T extends Pick<DrawItem, 'depth' | 'layer' | 'gx'>,
>(items: readonly T[]): T[] {
    return [...items].sort(compareDrawItems);
}

export type Footprint = { gx: number; gy: number; w: number; h: number };

/**
 * Memotong objek multi-tile (rak, meja kasir) menjadi satu potongan per tile,
 * masing-masing dengan kedalamannya sendiri. Ini menghindari kesalahan klasik
 * isometrik saat aktor berdiri di sebelah objek panjang.
 */
export function sliceFootprint(
    fp: Footprint,
): (Tile & { depth: number; index: number })[] {
    const slices: (Tile & { depth: number; index: number })[] = [];

    for (let dy = 0; dy < fp.h; dy++) {
        for (let dx = 0; dx < fp.w; dx++) {
            const gx = fp.gx + dx;
            const gy = fp.gy + dy;
            slices.push({
                gx,
                gy,
                depth: depthOf(gx, gy),
                index: slices.length,
            });
        }
    }

    return slices;
}

/** Kedalaman aktor dari posisi pecahannya saat berjalan. */
export function actorDepth(fx: number, fy: number): number {
    return depthOf(fx, fy);
}

export function effectDepth(ownerDepth: number): number {
    return ownerDepth + 0.1;
}
