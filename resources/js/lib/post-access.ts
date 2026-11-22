/**
 * Arti jawaban server saat tombol pos ditekan (Tahap 5D-2). Server yang memutuskan
 * (Gate `open-post`); browser hanya membuka panel bila diizinkan, atau
 * menampilkan pesan singkat di diorama bila ditolak. Murni supaya bisa dites.
 */
import type { PostKey } from '@/diorama/scenes/store-scene';

export type PostOption = {
    label: string;
    /** null = halaman belum ada: nonaktif, "segera hadir". */
    href: string | null;
};

export type PostAccess =
    | { type: 'open'; options: PostOption[] }
    | { type: 'denied'; message: string };

export const MESSAGES = {
    session: 'Sesi berakhir. Silakan masuk lagi.',
    failed: 'Pos gagal dibuka. Coba lagi.',
} as const;

function isOptions(value: unknown): value is PostOption[] {
    return (
        Array.isArray(value) &&
        value.every(
            (o) =>
                typeof o === 'object' &&
                o !== null &&
                typeof (o as PostOption).label === 'string' &&
                ((o as PostOption).href === null ||
                    typeof (o as PostOption).href === 'string'),
        )
    );
}

/** Ubah status dan isi jawaban server menjadi "buka panel" atau "tolak dengan pesan". */
export function readPostAccess(
    post: PostKey,
    status: number,
    body: unknown,
): PostAccess {
    const data = (body ?? {}) as {
        key?: unknown;
        options?: unknown;
        message?: unknown;
    };

    if (status === 200 && data.key === post && isOptions(data.options)) {
        return { type: 'open', options: data.options };
    }

    if (status === 403) {
        return {
            type: 'denied',
            message:
                typeof data.message === 'string' && data.message !== ''
                    ? data.message
                    : 'Anda tidak bisa membuka pos ini.',
        };
    }

    if (status === 401 || status === 419) {
        return { type: 'denied', message: MESSAGES.session };
    }

    return { type: 'denied', message: MESSAGES.failed };
}
