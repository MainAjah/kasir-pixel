import { facingOf } from './iso';
import type { Facing, Tile } from './iso';

/** Aktor yang bisa berjalan menyusuri jalur tile (pelanggan dan penjaga kasir). */
export type Mover = { fx: number; fy: number; path: Tile[]; facing: Facing };

/**
 * Maju sejauh `distance` tile menyusuri jalur 4 arah, mengubah arah hadap
 * menurut langkah. Mengembalikan true bila jalur sudah habis (tiba).
 */
export function moveAlong(mover: Mover, distance: number): boolean {
    let budget = distance;

    while (budget > 0 && mover.path.length > 0) {
        const next = mover.path[0];
        const dx = next.gx - mover.fx;
        const dy = next.gy - mover.fy;
        const length = Math.abs(dx) + Math.abs(dy);

        mover.facing = facingOf(Math.sign(dx), Math.sign(dy), mover.facing);

        if (length <= budget) {
            mover.fx = next.gx;
            mover.fy = next.gy;
            mover.path.shift();
            budget -= length;
        } else {
            mover.fx += Math.sign(dx) * Math.min(budget, Math.abs(dx));
            mover.fy += Math.sign(dy) * Math.min(budget, Math.abs(dy));
            budget = 0;
        }
    }

    return mover.path.length === 0;
}
