import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet, withQuery } from '@/lib/api';
import type { Query } from '@/lib/api';

/**
 * Memuat data halaman dari REST API (Tahap 11). Data lama tetap ditampilkan
 * selama memuat ulang (filter berganti) atau bila muatan berikutnya gagal,
 * supaya layar tidak berkedip kosong.
 */
export function useApi<T>(url: string, query: Query = {}) {
    const key = withQuery(url, query);
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<ApiError | null>(null);
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        apiGet<T>(key, undefined, controller.signal)
            .then((body) => {
                setData(body);
                setError(null);
            })
            .catch((e: unknown) => {
                if (e instanceof ApiError) {
                    setError(e);
                } else if (
                    !(e instanceof DOMException && e.name === 'AbortError')
                ) {
                    setError(new ApiError(0, 'Gagal memuat data.'));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [key, tick]);

    const reload = useCallback(() => setTick((t) => t + 1), []);

    return { data, error, loading, reload };
}
