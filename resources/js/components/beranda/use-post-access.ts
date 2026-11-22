import { useCallback, useEffect, useRef, useState } from 'react';
import type { PostKey } from '@/diorama/scenes/store-scene';
import { MESSAGES, readPostAccess } from '@/lib/post-access';
import type { PostOption } from '@/lib/post-access';
import { post as postRoute } from '@/routes/dashboard';
import { POSTS } from './posts';
import type { PostInfo } from './posts';

/** Lama pesan penolakan tampil di diorama (ms). */
export const NOTICE_MS = 3500;

/**
 * Membuka pos lewat server: panel hanya dibuka bila server mengizinkan (Gate
 * `open-post`) dan pilihannya datang dari jawaban server; bila ditolak, pesan
 * singkat tampil di atas tombol pos lalu hilang sendiri.
 */
export function usePostAccess() {
    const [panel, setPanel] = useState<{
        post: PostInfo;
        options: PostOption[];
    } | null>(null);
    const [notice, setNotice] = useState<{
        key: PostKey;
        message: string;
    } | null>(null);
    const timer = useRef<number | undefined>(undefined);
    const busy = useRef(false);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const showNotice = useCallback((key: PostKey, message: string) => {
        window.clearTimeout(timer.current);
        setNotice({ key, message });
        timer.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
    }, []);

    const open = useCallback(
        async (key: PostKey) => {
            if (busy.current) {
                return;
            }

            busy.current = true;

            try {
                const response = await fetch(postRoute.url(key), {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                });
                const body: unknown = await response.json().catch(() => null);
                const access = readPostAccess(key, response.status, body);

                if (access.type === 'open') {
                    window.clearTimeout(timer.current);
                    setNotice(null);
                    setPanel({ post: POSTS[key], options: access.options });
                } else {
                    showNotice(key, access.message);
                }
            } catch {
                showNotice(key, MESSAGES.failed);
            } finally {
                busy.current = false;
            }
        },
        [showNotice],
    );

    const close = useCallback(() => setPanel(null), []);

    return { panel, notice, open, close };
}
