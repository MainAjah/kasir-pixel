/**
 * Data polling Beranda (Tahap 5D-1) dan cara mengubahnya menjadi peristiwa
 * diorama. Murni (tanpa fetch, tanpa DOM) supaya bisa dites.
 *
 * Penjualan baru diputar sebagai `sale.completed` (adaptor membuang yang ganda,
 * misalnya bila sudah datang lewat pemancar browser), pembatalan sebagai
 * `sale.voided`. Diorama hanya membaca.
 */
import type { DioramaItem, RawEventName } from './feed';
import type { ShelfLevels } from './shelves';

export type FeedCursor = { sale: number; void: number };

export type TodayNumbers = {
    sales_total: number;
    sales_count: number;
    low_stock: number;
};

export type FeedPayload = {
    sales: { number: string; total: number; items: DioramaItem[] }[];
    voids: { number: string; total: number }[];
    today: TodayNumbers;
    shelves: ShelfLevels;
    cursor: FeedCursor;
};

/** Jeda polling (detik). */
export const POLL_SECONDS = 5;

/** Peristiwa yang diputar dari satu hasil polling, urut: penjualan lalu pembatalan. */
export function feedEvents(payload: FeedPayload): [RawEventName, unknown][] {
    return [
        ...payload.sales.map((sale): [RawEventName, unknown] => [
            'sale.completed',
            sale,
        ]),
        ...payload.voids.map((v): [RawEventName, unknown] => [
            'sale.voided',
            v,
        ]),
    ];
}

/** Kursor hanya maju; jawaban lama yang datang terlambat tidak memundurkannya. */
export function nextCursor(current: FeedCursor, next: FeedCursor): FeedCursor {
    return {
        sale: Math.max(current.sale, next.sale),
        void: Math.max(current.void, next.void),
    };
}
