/**
 * Adaptor peristiwa diorama (docs/diorama-rancangan.md bagian 9).
 *
 * Menormalkan peristiwa dari beberapa sumber (pemancar browser sekarang, polling
 * di 5D, Reverb di Tahap 8) menjadi satu bentuk, membuang yang cacat, dan membuang
 * penjualan selesai atau batal yang sama bila datang dua kali dari sumber berbeda.
 * Mesin diorama hanya membaca hasilnya; diorama tidak pernah menulis data.
 *
 * Berkas ini sengaja tidak mengimpor store-events.ts (yang membawa rute Wayfinder)
 * agar bisa dites murni. Penyambungnya ada di `connectStoreEvents`.
 */

export type DioramaItem = { name: string; unit: string; qty: number };

export type DioramaEvent =
    | { type: 'sale.opened' }
    | { type: 'item.scanned'; item: DioramaItem }
    | {
          type: 'sale.completed';
          number: string;
          total: number;
          items: DioramaItem[];
      }
    | { type: 'sale.voided'; number: string; total: number }
    /** Permintaan pelanggan latar (tombol uji atau penjadwal saat sepi). */
    | { type: 'background' };

export type RawEventName =
    | 'sale.opened'
    | 'item.scanned'
    | 'sale.completed'
    | 'sale.voided';

type Listener = (event: DioramaEvent) => void;

/** Bentuk fungsi `onStoreEvent` dari resources/js/lib/store-events.ts. */
export type StoreEventSubscriber = (
    name: RawEventName,
    handler: (detail: unknown) => void,
) => () => void;

const SEEN_LIMIT = 200;

export class DioramaFeed {
    private readonly listeners = new Set<Listener>();
    private readonly seen: string[] = [];

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);

        return () => this.listeners.delete(listener);
    }

    /** Masukkan peristiwa mentah. Mengembalikan peristiwa ternormal, atau null bila dibuang. */
    push(name: string, detail: unknown): DioramaEvent | null {
        const event = normalizeEvent(name, detail);

        if (event === null || this.isDuplicate(event)) {
            return null;
        }

        for (const listener of this.listeners) {
            listener(event);
        }

        return event;
    }

    /** Berlangganan semua peristiwa toko lewat `onStoreEvent`. Mengembalikan pemutus. */
    connect(subscribe: StoreEventSubscriber): () => void {
        const names: RawEventName[] = [
            'sale.opened',
            'item.scanned',
            'sale.completed',
            'sale.voided',
        ];
        const offs = names.map((name) =>
            subscribe(name, (detail) => this.push(name, detail)),
        );

        return () => offs.forEach((off) => off());
    }

    private isDuplicate(event: DioramaEvent): boolean {
        if (event.type !== 'sale.completed' && event.type !== 'sale.voided') {
            return false;
        }

        const key = `${event.type}:${event.number}`;

        if (this.seen.includes(key)) {
            return true;
        }

        this.seen.push(key);

        if (this.seen.length > SEEN_LIMIT) {
            this.seen.shift();
        }

        return false;
    }
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)
        : {};
}

function asText(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value.trim() : fallback;
}

/** Rupiah bulat, tidak minus. Nilai tak terbaca menjadi null. */
function asRupiah(value: unknown): number | null {
    const number = typeof value === 'string' ? Number(value) : value;

    return typeof number === 'number' && Number.isFinite(number)
        ? Math.max(0, Math.round(number))
        : null;
}

function normalizeItem(value: unknown): DioramaItem | null {
    const raw = asRecord(value);
    const name = asText(raw.name ?? raw.product);

    if (name === '') {
        return null;
    }

    const qty = asRupiah(raw.qty);

    return {
        name,
        unit: asText(raw.unit, 'pcs') || 'pcs',
        qty: qty !== null && qty > 0 ? qty : 1,
    };
}

export function normalizeEvent(
    name: string,
    detail: unknown,
): DioramaEvent | null {
    const raw = asRecord(detail);

    switch (name) {
        case 'sale.opened':
            return { type: 'sale.opened' };

        case 'item.scanned': {
            const item = normalizeItem(raw);

            return item ? { type: 'item.scanned', item } : null;
        }

        case 'sale.completed': {
            const number = asText(raw.number);
            const total = asRupiah(raw.total);

            if (number === '' || total === null) {
                return null;
            }

            const items = Array.isArray(raw.items)
                ? raw.items
                      .map(normalizeItem)
                      .filter((item): item is DioramaItem => item !== null)
                : [];

            return { type: 'sale.completed', number, total, items };
        }

        case 'sale.voided': {
            const number = asText(raw.number);
            const total = asRupiah(raw.total);

            return number === '' || total === null
                ? null
                : { type: 'sale.voided', number, total };
        }

        case 'background':
            return { type: 'background' };

        default:
            return null;
    }
}
