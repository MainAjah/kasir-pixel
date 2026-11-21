import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { emitStoreEvent } from '@/lib/store-events';
import type { StoreEventMap, StoreEventName } from '@/lib/store-events';

type Flash = { name: StoreEventName; detail: unknown };

/**
 * Meneruskan peristiwa yang dititipkan server lewat flash (selesai atau batal)
 * ke pemancar peristiwa di browser kasir.
 */
export default function StoreEventBridge() {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.store_event as Flash | undefined;

            if (!data) {
                return;
            }

            if (data.name === 'sale.completed' || data.name === 'sale.voided') {
                emitStoreEvent(
                    data.name,
                    data.detail as StoreEventMap[typeof data.name],
                );
            }
        });
    }, []);

    return null;
}
