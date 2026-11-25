import { describe, expect, it } from 'vite-plus/test';
import { pageQuery, readApiError, toPageLinks, withQuery } from './api';

describe('pembantu REST API (Tahap 11)', () => {
    it('422 membawa galat pertama tiap isian dan pesan server', () => {
        const e = readApiError(422, {
            message: 'Tanggal akhir tidak valid.',
            errors: { sampai: ['Tanggal akhir tidak valid.', 'lain'] },
        });

        expect(e.status).toBe(422);
        expect(e.message).toBe('Tanggal akhir tidak valid.');
        expect(e.errors).toEqual({ sampai: 'Tanggal akhir tidak valid.' });
    });

    it('401, 419, 500, dan gagal jaringan memakai pesan bawaan', () => {
        expect(readApiError(401, { message: 'Unauthenticated.' }).message).toBe(
            'Sesi login berakhir. Silakan masuk lagi.',
        );
        expect(readApiError(419, { message: 'CSRF' }).message).toContain(
            'kedaluwarsa',
        );
        expect(readApiError(500, { message: 'SQLSTATE...' }).message).toBe(
            'Terjadi galat di server. Coba lagi.',
        );
        expect(readApiError(0, null).message).toContain('menghubungi server');
    });

    it('403 memakai pesan server bila ada', () => {
        expect(readApiError(403, { message: 'Khusus admin.' }).message).toBe(
            'Khusus admin.',
        );
        expect(readApiError(403, null).message).toBe(
            'Anda tidak berhak membuka data ini.',
        );
    });

    it('withQuery membuang nilai kosong', () => {
        expect(withQuery('/api/v1/laporan', {})).toBe('/api/v1/laporan');
        expect(
            withQuery('/api/v1/laporan', {
                periode: 'rentang',
                dari: '2026-11-01',
                kasir: null,
                cari: '',
            }),
        ).toBe('/api/v1/laporan?periode=rentang&dari=2026-11-01');
        expect(withQuery('/a?x=1', { y: 2 })).toBe('/a?x=1&y=2');
    });

    it('pageQuery membaca query alamat halaman', () => {
        expect(pageQuery('/laporan/penjualan')).toEqual({});
        expect(pageQuery('/laporan/penjualan?periode=7-hari&kasir=3')).toEqual({
            periode: '7-hari',
            kasir: '3',
        });
    });

    it('toPageLinks mengganti alamat API dengan alamat halaman web', () => {
        const links = toPageLinks(
            [
                { url: null, label: '&laquo; Previous', active: false },
                {
                    url: 'http://kasir.test/api/v1/produk?cari=mi&page=2',
                    label: '2',
                    active: false,
                },
            ],
            '/inventaris/produk?cari=mi&status=menipis',
        );

        expect(links[0].url).toBeNull();
        expect(links[1].url).toBe(
            '/inventaris/produk?cari=mi&status=menipis&page=2',
        );
    });
});
