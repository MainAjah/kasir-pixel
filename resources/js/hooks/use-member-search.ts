import { useEffect, useState } from 'react';
import MemberLookupController from '@/actions/App/Http/Controllers/Pos/MemberLookupController';
import type { MemberHit } from '@/types';

/**
 * Pencarian anggota untuk layar kasir (nomor atau nama), dengan jeda singkat
 * agar server tidak ditembak tiap ketukan. Tanpa tampilan; hanya data.
 */
export function useMemberSearch(query: string, delayMs = 250): MemberHit[] {
    const [results, setResults] = useState<MemberHit[]>([]);

    useEffect(() => {
        const q = query.trim();

        if (q === '') {
            setResults([]);

            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(
                    MemberLookupController.search.url({ query: { q } }),
                    {
                        headers: { Accept: 'application/json' },
                        credentials: 'same-origin',
                    },
                );
                setResults(res.ok ? ((await res.json()) as MemberHit[]) : []);
            } catch {
                setResults([]);
            }
        }, delayMs);

        return () => clearTimeout(timer);
    }, [query, delayMs]);

    return results;
}
