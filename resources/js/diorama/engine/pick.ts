/**
 * Klik pelanggan (Tahap 5D-2): pelanggan mana yang ada di titik kanvas dasar.
 * Kotak sentuh sedikit lebih lebar dari badan supaya mudah diklik; bila
 * bertumpuk, yang paling depan (paling dekat penonton) yang dipilih.
 */
import type { Customer } from '../actors/customer';
import { depthOf, tileCenter } from './iso';
import type { Point } from './iso';

/** Kotak sentuh relatif ke titik pijak (px kanvas dasar). */
export const HIT_BOX = { left: -13, right: 13, top: -50, bottom: 3 } as const;

export function customerAt(
    customers: readonly Customer[],
    point: Point,
): Customer | null {
    let best: Customer | null = null;

    for (const customer of customers) {
        if (customer.state === 'hilang' || customer.fx < 0) {
            continue;
        }

        const foot = tileCenter(customer.fx, customer.fy);
        const dx = point.x - foot.x;
        const dy = point.y - foot.y;

        if (
            dx >= HIT_BOX.left &&
            dx <= HIT_BOX.right &&
            dy >= HIT_BOX.top &&
            dy <= HIT_BOX.bottom &&
            (best === null ||
                depthOf(customer.fx, customer.fy) > depthOf(best.fx, best.fy))
        ) {
            best = customer;
        }
    }

    return best;
}

/** Puncak kepala pelanggan (untuk meletakkan kartu barang di atasnya). */
export function customerHead(customer: Customer): Point {
    const foot = tileCenter(customer.fx, customer.fy);

    return { x: foot.x, y: foot.y + HIT_BOX.top };
}
