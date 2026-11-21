import { tileKey } from './iso';
import type { Tile } from './iso';

export type Grid = {
    width: number;
    height: number;
    /** Tile terlarang (perabot dan area penjaga), dengan kunci "gx,gy". */
    blocked: ReadonlySet<string>;
};

export function inBounds(grid: Grid, gx: number, gy: number): boolean {
    return gx >= 0 && gy >= 0 && gx < grid.width && gy < grid.height;
}

export function isWalkable(grid: Grid, gx: number, gy: number): boolean {
    return inBounds(grid, gx, gy) && !grid.blocked.has(tileKey(gx, gy));
}

// Urutan tetangga tetap agar hasil BFS selalu sama untuk masukan yang sama.
const STEPS: readonly Tile[] = [
    { gx: 1, gy: 0 },
    { gx: 0, gy: 1 },
    { gx: -1, gy: 0 },
    { gx: 0, gy: -1 },
];

/**
 * Jalur terpendek 4 arah (tanpa diagonal) dari `from` ke `to`.
 *
 * Hasil: daftar tile setelah `from` sampai `to` (inklusif); `[]` bila sudah di tujuan;
 * `null` bila tujuan terlarang, di luar grid, atau tidak terjangkau.
 */
export function bfs(grid: Grid, from: Tile, to: Tile): Tile[] | null {
    if (!isWalkable(grid, to.gx, to.gy) || !inBounds(grid, from.gx, from.gy)) {
        return null;
    }

    if (from.gx === to.gx && from.gy === to.gy) {
        return [];
    }

    const startKey = tileKey(from.gx, from.gy);
    const goalKey = tileKey(to.gx, to.gy);
    const parent = new Map<string, string | null>([[startKey, null]]);
    const queue: Tile[] = [from];

    for (let head = 0; head < queue.length; head++) {
        const current = queue[head];

        for (const step of STEPS) {
            const gx = current.gx + step.gx;
            const gy = current.gy + step.gy;
            const key = tileKey(gx, gy);

            if (parent.has(key) || !isWalkable(grid, gx, gy)) {
                continue;
            }

            parent.set(key, tileKey(current.gx, current.gy));

            if (key === goalKey) {
                return unwind(parent, goalKey);
            }

            queue.push({ gx, gy });
        }
    }

    return null;
}

function unwind(parent: Map<string, string | null>, goalKey: string): Tile[] {
    const path: Tile[] = [];

    for (
        let key: string | null = goalKey;
        key !== null && parent.get(key) !== null;
        key = parent.get(key) ?? null
    ) {
        const [gx, gy] = key.split(',').map(Number);
        path.push({ gx, gy });
    }

    return path.reverse();
}
