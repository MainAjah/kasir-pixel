import { describe, expect, it } from 'vite-plus/test';
import { readCheckoutResponse } from './checkout';

describe('jawaban checkout REST API (Tahap 10)', () => {
    it('201 berisi nota', () => {
        const result = readCheckoutResponse(201, {
            data: { number: 'INV-1', total: 5000, receipt_url: '/x' },
        });

        expect(result.ok).toBe(true);
        expect(result.ok && result.sale.number).toBe('INV-1');
    });

    it('409 membawa pesan dan barang yang gagal', () => {
        expect(
            readCheckoutResponse(409, {
                message: 'Stok Barang 4 tidak cukup',
                rolled_back: true,
                failed_item: { product_id: 4 },
            }),
        ).toEqual({
            ok: false,
            message: 'Stok Barang 4 tidak cukup',
            failedProductId: 4,
        });
    });

    it('422 memakai galat validasi pertama, lalu pesan', () => {
        expect(
            readCheckoutResponse(422, {
                message: 'x',
                errors: { tendered: ['Uang diterima wajib diisi.'] },
            }),
        ).toMatchObject({ message: 'Uang diterima wajib diisi.' });

        expect(
            readCheckoutResponse(422, {
                message: 'Buka shift dulu sebelum menjual.',
            }),
        ).toMatchObject({
            message: 'Buka shift dulu sebelum menjual.',
            failedProductId: null,
        });
    });

    it('sesi habis dan galat lain memakai pesan yang jelas', () => {
        expect(
            readCheckoutResponse(419, { message: 'CSRF token mismatch.' }),
        ).toMatchObject({
            message: 'Sesi kedaluwarsa. Muat ulang halaman lalu coba lagi.',
        });
        expect(
            readCheckoutResponse(401, { message: 'Unauthenticated.' }),
        ).toMatchObject({
            message: 'Sesi login berakhir. Silakan masuk lagi.',
        });
        expect(readCheckoutResponse(500, null)).toMatchObject({
            message: 'Penjualan gagal disimpan.',
        });
    });
});
