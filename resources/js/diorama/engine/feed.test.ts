import { describe, expect, it, vi } from 'vite-plus/test';
import { DioramaFeed, normalizeEvent } from './feed';
import type { DioramaEvent, StoreEventSubscriber } from './feed';

describe('normalizeEvent', () => {
    it('menormalkan barang yang dipindai', () => {
        expect(
            normalizeEvent('item.scanned', {
                product: '  Gula  ',
                unit: 'pak',
                qty: '2',
            }),
        ).toEqual({
            type: 'item.scanned',
            item: { name: 'Gula', unit: 'pak', qty: 2 },
        });
    });

    it('jumlah tidak sah menjadi 1, satuan kosong menjadi pcs', () => {
        expect(
            normalizeEvent('item.scanned', { product: 'Teh', qty: -3 }),
        ).toEqual({
            type: 'item.scanned',
            item: { name: 'Teh', unit: 'pcs', qty: 1 },
        });
    });

    it('total dibulatkan ke rupiah dan tidak minus; barang cacat dibuang', () => {
        expect(
            normalizeEvent('sale.completed', {
                number: 'J-1',
                total: 12500.4,
                items: [
                    { name: 'Teh', unit: 'kotak', qty: 1 },
                    { unit: 'x' },
                    null,
                ],
            }),
        ).toEqual({
            type: 'sale.completed',
            number: 'J-1',
            total: 12500,
            items: [{ name: 'Teh', unit: 'kotak', qty: 1 }],
        });
        expect(
            normalizeEvent('sale.voided', { number: 'J-1', total: -5 }),
        ).toEqual({
            type: 'sale.voided',
            number: 'J-1',
            total: 0,
        });
    });

    it('membuang peristiwa cacat atau tidak dikenal', () => {
        expect(normalizeEvent('item.scanned', { qty: 1 })).toBeNull();
        expect(normalizeEvent('sale.completed', { total: 1000 })).toBeNull();
        expect(
            normalizeEvent('sale.completed', { number: 'J-2', total: 'abc' }),
        ).toBeNull();
        expect(normalizeEvent('sale.voided', null)).toBeNull();
        expect(normalizeEvent('stock.moved', {})).toBeNull();
    });
});

describe('DioramaFeed', () => {
    it('meneruskan peristiwa ternormal ke pelanggan feed', () => {
        const feed = new DioramaFeed();
        const seen: DioramaEvent[] = [];
        feed.subscribe((e) => seen.push(e));

        feed.push('sale.opened', { cashier: 'Kasir Satu' });
        feed.push('item.scanned', { qty: 1 });

        expect(seen).toEqual([{ type: 'sale.opened' }]);
    });

    it('penjualan selesai atau batal yang sama dari dua sumber hanya diproses sekali', () => {
        const feed = new DioramaFeed();
        const listener = vi.fn();
        feed.subscribe(listener);

        feed.push('sale.completed', { number: 'J-9', total: 5000, items: [] });
        feed.push('sale.completed', { number: 'J-9', total: 5000, items: [] });
        feed.push('sale.voided', { number: 'J-9', total: 5000 });
        feed.push('sale.voided', { number: 'J-9', total: 5000 });

        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('berlangganan keempat peristiwa onStoreEvent dan bisa diputus', () => {
        const handlers = new Map<string, (detail: unknown) => void>();
        const unsubscribed: string[] = [];
        const subscribe: StoreEventSubscriber = (name, handler) => {
            handlers.set(name, handler);

            return () => unsubscribed.push(name);
        };

        const feed = new DioramaFeed();
        const seen: DioramaEvent[] = [];
        feed.subscribe((e) => seen.push(e));
        const off = feed.connect(subscribe);

        expect([...handlers.keys()]).toEqual([
            'sale.opened',
            'item.scanned',
            'sale.completed',
            'sale.voided',
        ]);

        handlers.get('item.scanned')?.({
            product: 'Beras',
            unit: 'sak',
            qty: 1,
        });
        expect(seen).toEqual([
            {
                type: 'item.scanned',
                item: { name: 'Beras', unit: 'sak', qty: 1 },
            },
        ]);

        off();
        expect(unsubscribed).toHaveLength(4);
    });

    it('berhenti meneruskan setelah pelanggan feed berhenti', () => {
        const feed = new DioramaFeed();
        const listener = vi.fn();
        const off = feed.subscribe(listener);
        off();
        feed.push('sale.opened', {});

        expect(listener).not.toHaveBeenCalled();
    });
});
