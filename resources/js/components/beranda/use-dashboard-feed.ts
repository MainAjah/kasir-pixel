import { useEffect, useRef } from 'react';
import type { DioramaFeed } from '@/diorama/engine/feed';
import { POLL_SECONDS, feedEvents, nextCursor } from '@/diorama/engine/poll';
import type { FeedCursor, FeedPayload } from '@/diorama/engine/poll';
import type { DioramaWorld } from '@/diorama/engine/world';
import { feed as feedRoute } from '@/routes/dashboard';

type Options = {
    cursor: FeedCursor;
    feed: DioramaFeed;
    world: DioramaWorld;
    onData: (payload: FeedPayload) => void;
};

/**
 * Polling Beranda tiap 5 detik (hanya membaca): penjualan dan pembatalan baru
 * diputar di diorama, angka "Hari Ini" dan isi rak diperbarui. Berhenti saat tab
 * tersembunyi dan langsung menyusul saat tab tampil lagi. Kegagalan diabaikan;
 * percobaan berikutnya 5 detik kemudian.
 */
export function useDashboardFeed({ cursor, feed, world, onData }: Options) {
    const cursorRef = useRef(cursor);
    const onDataRef = useRef(onData);

    useEffect(() => {
        onDataRef.current = onData;
    }, [onData]);

    useEffect(() => {
        let busy = false;
        let stopped = false;

        const poll = async () => {
            if (busy || stopped || document.hidden) {
                return;
            }

            busy = true;

            try {
                const response = await fetch(
                    feedRoute.url({ query: { ...cursorRef.current } }),
                    {
                        credentials: 'same-origin',
                        headers: { Accept: 'application/json' },
                    },
                );

                if (!response.ok || stopped) {
                    return;
                }

                const payload = (await response.json()) as FeedPayload;

                for (const [name, detail] of feedEvents(payload)) {
                    feed.push(name, detail);
                }

                // Layar mini kasir mengikuti total nyata dari server.
                world.dailyTotal = payload.today.sales_total;
                cursorRef.current = nextCursor(
                    cursorRef.current,
                    payload.cursor,
                );
                onDataRef.current(payload);
            } catch {
                // Jaringan putus: diam saja, coba lagi nanti.
            } finally {
                busy = false;
            }
        };

        const timer = window.setInterval(
            () => void poll(),
            POLL_SECONDS * 1000,
        );
        const onVisible = () => {
            if (!document.hidden) {
                void poll();
            }
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            stopped = true;
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [feed, world]);
}
