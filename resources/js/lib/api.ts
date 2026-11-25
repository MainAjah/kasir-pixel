/**
 * Pembantu REST API untuk semua halaman (Tahap 11): halaman Inertia hanya
 * kerangka, datanya dibaca dan ditulis lewat /api/v1 dengan cookie sesi yang
 * sama (Sanctum stateful) dan header X-XSRF-TOKEN. Tanpa paket tambahan.
 */
import { xsrfToken } from '@/lib/store-events';
import { login } from '@/routes';
import type { PaginationLink } from '@/types/inventory';

export type Query = Record<string, string | number | null | undefined>;

/** Galat dari API: status HTTP, pesan untuk ditampilkan, dan galat per isian (422). */
export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public errors: Record<string, string> = {},
        public body: unknown = null,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

const FALLBACK: Record<number, string> = {
    0: 'Gagal menghubungi server. Periksa koneksi lalu coba lagi.',
    401: 'Sesi login berakhir. Silakan masuk lagi.',
    403: 'Anda tidak berhak membuka data ini.',
    404: 'Data tidak ditemukan.',
    419: 'Sesi kedaluwarsa. Muat ulang halaman lalu coba lagi.',
    429: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.',
};

/** Ubah jawaban gagal menjadi ApiError. Murni, supaya bisa dites. */
export function readApiError(status: number, body: unknown): ApiError {
    const b = (body ?? {}) as {
        message?: string;
        errors?: Record<string, string[] | string>;
    };
    const errors: Record<string, string> = {};

    for (const [key, value] of Object.entries(b.errors ?? {})) {
        const first = Array.isArray(value) ? value[0] : value;

        if (first) {
            errors[key] = first;
        }
    }

    const useServerMessage =
        b.message && status !== 401 && status !== 419 && status < 500;
    const message = useServerMessage
        ? (b.message as string)
        : (FALLBACK[status] ?? 'Terjadi galat di server. Coba lagi.');

    return new ApiError(status, message, errors, body);
}

/** Tempelkan query ke alamat; nilai kosong dibuang. */
export function withQuery(url: string, query: Query = {}): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        if (value !== null && value !== undefined && value !== '') {
            params.set(key, String(value));
        }
    }

    const qs = params.toString();

    if (qs === '') {
        return url;
    }

    return `${url}${url.includes('?') ? '&' : '?'}${qs}`;
}

/** Query string alamat halaman (mis. `usePage().url`) sebagai objek. */
export function pageQuery(pageUrl: string): Record<string, string> {
    const i = pageUrl.indexOf('?');

    return i < 0
        ? {}
        : Object.fromEntries(new URLSearchParams(pageUrl.slice(i + 1)));
}

/**
 * Adaptor paginasi: tautan halaman dari API (/api/v1/...?page=2) diubah menjadi
 * tautan halaman web yang sedang dibuka (alamat + query sekarang, page diganti),
 * sehingga komponen Pagination tetap memakai navigasi Inertia.
 */
export function toPageLinks(
    links: PaginationLink[],
    pageUrl: string,
): PaginationLink[] {
    return links.map((link) => {
        if (!link.url) {
            return link;
        }

        const page = new URL(link.url, 'http://x').searchParams.get('page');
        const target = new URL(pageUrl, 'http://x');

        if (page) {
            target.searchParams.set('page', page);
        }

        return { ...link, url: `${target.pathname}${target.search}` };
    });
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
    method: Method,
    url: string,
    body?: unknown,
    signal?: AbortSignal,
): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': xsrfToken(),
    };
    let payload: BodyInit | undefined;

    if (body instanceof FormData) {
        payload = body;
    } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    let res: Response;

    try {
        res = await fetch(url, {
            method,
            credentials: 'same-origin',
            headers,
            body: payload,
            signal,
        });
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
            throw e;
        }

        throw readApiError(0, null);
    }

    const data: unknown =
        res.status === 204 ? null : await res.json().catch(() => null);

    if (res.ok) {
        return data as T;
    }

    if (res.status === 401) {
        window.location.assign(login.url());
    }

    throw readApiError(res.status, data);
}

export function apiGet<T>(
    url: string,
    query?: Query,
    signal?: AbortSignal,
): Promise<T> {
    return request<T>('GET', withQuery(url, query), undefined, signal);
}

export function apiSend<T>(
    method: Exclude<Method, 'GET'>,
    url: string,
    body?: unknown,
): Promise<T> {
    return request<T>(method, url, body);
}
