import { describe, expect, it } from 'vite-plus/test';
import { MESSAGES, readPostAccess } from './post-access';

const options = [
    { label: 'Transaksi', href: '/kasir', note: null },
    { label: 'Laporan penjualan', href: null, note: 'khusus admin' },
];

describe('akses pos dari jawaban server (5D-2)', () => {
    it('diizinkan: panel dibuka dengan pilihan dari server', () => {
        expect(readPostAccess('kasir', 200, { key: 'kasir', options })).toEqual(
            { type: 'open', options },
        );
    });

    it('ditolak server: pesan singkat dari server ditampilkan, panel tidak dibuka', () => {
        expect(
            readPostAccess('inventaris', 403, {
                message: 'Pos Inventaris hanya untuk Admin.',
            }),
        ).toEqual({
            type: 'denied',
            message: 'Pos Inventaris hanya untuk Admin.',
        });
    });

    it('ditolak tanpa pesan: tetap ditolak dengan pesan bawaan', () => {
        const result = readPostAccess('inventaris', 403, null);

        expect(result.type).toBe('denied');
    });

    it('sesi habis atau token kedaluwarsa: minta masuk lagi', () => {
        expect(readPostAccess('kasir', 401, {})).toEqual({
            type: 'denied',
            message: MESSAGES.session,
        });
        expect(readPostAccess('kasir', 419, {})).toEqual({
            type: 'denied',
            message: MESSAGES.session,
        });
    });

    it('jawaban aneh tidak pernah membuka panel', () => {
        // Pos lain, isi rusak, atau galat server.
        expect(
            readPostAccess('kasir', 200, { key: 'inventaris', options }).type,
        ).toBe('denied');
        expect(
            readPostAccess('kasir', 200, { key: 'kasir', options: 'x' }).type,
        ).toBe('denied');
        expect(
            readPostAccess('kasir', 200, {
                key: 'kasir',
                options: [{ label: 1 }],
            }).type,
        ).toBe('denied');
        expect(readPostAccess('kasir', 500, {})).toEqual({
            type: 'denied',
            message: MESSAGES.failed,
        });
    });
});
