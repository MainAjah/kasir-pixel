import { describe, expect, it } from 'vite-plus/test';
import { DioramaFeed } from './feed';
import type { DioramaEvent } from './feed';
import { feedEvents, nextCursor } from './poll';
import type { FeedPayload } from './poll';
import { DioramaWorld } from './world';

const payload = (over: Partial<FeedPayload> = {}): FeedPayload => ({
    sales: [],
    voids: [],
    today: { sales_total: 0, sales_count: 0, low_stock: 0 },
    shelves: { rak: [], vending: [] },
    cursor: { sale: 0, void: 0 },
    ...over,
});

const sale = (number: string, total = 6000) => ({
    number,
    total,
    items: [{ name: 'Mi instan', unit: 'pcs', qty: 2 }],
});

describe('polling Beranda', () => {
    it('penjualan baru diputar sebagai sale.completed, lalu pembatalan', () => {
        const events = feedEvents(
            payload({
                sales: [sale('INV-1'), sale('INV-2')],
                voids: [{ number: 'INV-0', total: 3000 }],
            }),
        );

        expect(events.map(([name]) => name)).toEqual([
            'sale.completed',
            'sale.completed',
            'sale.voided',
        ]);
    });

    it('penjualan dari polling memunculkan pembeli di diorama, dan yang ganda dibuang', () => {
        const feed = new DioramaFeed();
        const world = new DioramaWorld({ seed: 1 });
        const seen: DioramaEvent[] = [];
        feed.subscribe((e) => {
            seen.push(e);
            world.handle(e);
        });

        const first = payload({ sales: [sale('INV-7')] });

        for (const [name, detail] of feedEvents(first)) {
            feed.push(name, detail);
        }

        // Polling berikutnya (atau pemancar browser) membawa penjualan yang sama.
        for (const [name, detail] of feedEvents(first)) {
            feed.push(name, detail);
        }

        expect(seen).toHaveLength(1);
        expect(world.pending).toHaveLength(1);
        expect(world.dailyTotal).toBe(6000);
    });

    it('kursor hanya maju', () => {
        expect(
            nextCursor({ sale: 10, void: 2 }, { sale: 12, void: 1 }),
        ).toEqual({ sale: 12, void: 2 });
    });
});
