/**
 * Pemancar peristiwa toko di browser. Layar kasir memancarkan peristiwa di sini
 * supaya diorama (Tahap 5) bergerak langsung tanpa menunggu server. Diorama hanya
 * berlangganan (onStoreEvent); ia tidak pernah mengubah data.
 *
 * Nama peristiwa sama dengan kelas Laravel di app/Events (StoreEvent::name()).
 * "sale.opened" dan "item.scanned" juga dikirim ke server (fire-and-forget) supaya
 * layar lain bisa menerimanya lewat Reverb di Tahap 8.
 */
import StoreEventController from '@/actions/App/Http/Controllers/Pos/StoreEventController';

export type StoreEventMap = {
    'sale.opened': { cashier: string };
    'item.scanned': { product: string; unit: string; qty: number };
    'sale.completed': {
        number: string;
        total: number;
        items: { name: string; unit: string; qty: number }[];
    };
    'sale.voided': { number: string; total: number };
};

export type StoreEventName = keyof StoreEventMap;

const bus = new EventTarget();

export function emitStoreEvent<K extends StoreEventName>(
    name: K,
    detail: StoreEventMap[K],
): void {
    bus.dispatchEvent(new CustomEvent(name, { detail }));

    if (name === 'sale.opened') {
        relayToServer({ type: name });
    } else if (name === 'item.scanned') {
        relayToServer({
            type: name,
            ...(detail as StoreEventMap['item.scanned']),
        });
    }
}

export function onStoreEvent<K extends StoreEventName>(
    name: K,
    handler: (detail: StoreEventMap[K]) => void,
): () => void {
    const listener = (event: Event) =>
        handler((event as CustomEvent<StoreEventMap[K]>).detail);

    bus.addEventListener(name, listener);

    return () => bus.removeEventListener(name, listener);
}

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/** Fire-and-forget: tidak ditunggu, kegagalan diabaikan, tidak boleh memperlambat kasir. */
function relayToServer(body: Record<string, unknown>): void {
    try {
        void fetch(StoreEventController.store.url(), {
            method: 'POST',
            keepalive: true,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': xsrfToken(),
            },
            body: JSON.stringify(body),
        }).catch(() => undefined);
    } catch {
        // Diabaikan: animasi tidak penting dibanding transaksi.
    }
}
