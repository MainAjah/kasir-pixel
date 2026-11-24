/**
 * Checkout layar kasir lewat REST API (Tahap 10): POST /api/v1/penjualan dengan
 * cookie sesi kasir (Sanctum stateful) dan header X-XSRF-TOKEN. Hanya satuan dan
 * jumlah yang dikirim; harga dan stok diputuskan server dalam satu transaksi.
 */
import ApiSaleController from '@/actions/App/Http/Controllers/Api/SaleController';
import { xsrfToken } from '@/lib/store-events';

export type CheckoutPayload = {
    items: { product_unit_id: number; qty: number }[];
    tendered: number;
    member_id: number | null;
};

export type CheckoutSale = {
    id: number;
    number: string;
    total: number;
    tendered: number;
    change: number;
    items: {
        product_id: number;
        product_unit_id: number;
        name: string;
        unit: string;
        qty: number;
        unit_price: number;
        line_total: number;
    }[];
    receipt_url: string;
};

export type CheckoutResult =
    | { ok: true; sale: CheckoutSale }
    | { ok: false; message: string; failedProductId: number | null };

type ErrorBody = {
    message?: string;
    errors?: Record<string, string[]>;
    failed_item?: { product_id?: number | null } | null;
};

/** Ubah jawaban server menjadi hasil checkout. Murni, supaya bisa dites. */
export function readCheckoutResponse(
    status: number,
    body: unknown,
): CheckoutResult {
    if (status === 201) {
        return { ok: true, sale: (body as { data: CheckoutSale }).data };
    }

    const error = (body ?? {}) as ErrorBody;

    if (status === 409) {
        return {
            ok: false,
            message:
                error.message ??
                'Stok salah satu barang tidak cukup. Seluruh transaksi dibatalkan.',
            failedProductId: error.failed_item?.product_id ?? null,
        };
    }

    if (status === 422) {
        const first = Object.values(error.errors ?? {})[0]?.[0];

        return {
            ok: false,
            message: first ?? error.message ?? 'Penjualan gagal disimpan.',
            failedProductId: null,
        };
    }

    const fallback: Record<number, string> = {
        401: 'Sesi login berakhir. Silakan masuk lagi.',
        403: 'Anda tidak berhak melakukan penjualan.',
        419: 'Sesi kedaluwarsa. Muat ulang halaman lalu coba lagi.',
        429: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
    };

    return {
        ok: false,
        message:
            error.message && status !== 401 && status !== 419
                ? error.message
                : (fallback[status] ?? 'Penjualan gagal disimpan.'),
        failedProductId: null,
    };
}

export async function checkout(
    payload: CheckoutPayload,
): Promise<CheckoutResult> {
    let res: Response;

    try {
        res = await fetch(ApiSaleController.store.url(), {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': xsrfToken(),
            },
            body: JSON.stringify(payload),
        });
    } catch {
        return {
            ok: false,
            message: 'Gagal menghubungi server. Coba bayar lagi.',
            failedProductId: null,
        };
    }

    const body: unknown = await res.json().catch(() => null);

    return readCheckoutResponse(res.status, body);
}
