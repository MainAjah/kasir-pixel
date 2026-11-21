import { useEffect, useState } from 'react';
import { DioramaFeed } from '@/diorama/engine/feed';
import type { StoreEventSubscriber } from '@/diorama/engine/feed';
import { DioramaWorld } from '@/diorama/engine/world';
import type { WorldOptions } from '@/diorama/engine/world';
import { onStoreEvent } from '@/lib/store-events';

/**
 * Membuat dunia diorama dan adaptor peristiwanya, lalu menyambungkannya ke
 * pemancar peristiwa toko di browser (`onStoreEvent`). Diorama hanya membaca.
 */
export function useDiorama(options: WorldOptions = {}) {
    const [world] = useState(() => new DioramaWorld(options));
    const [feed] = useState(() => new DioramaFeed());

    useEffect(() => {
        const offWorld = feed.subscribe((event) => world.handle(event));
        const offBus = feed.connect(onStoreEvent as StoreEventSubscriber);

        return () => {
            offWorld();
            offBus();
        };
    }, [world, feed]);

    return { world, feed };
}
