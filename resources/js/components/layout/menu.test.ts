import { describe, expect, it } from 'vite-plus/test';
import { activeLink, menuFor } from './menu';

const titles = (roles: string[]) =>
    menuFor(roles).map((g) => [g.title, (g.items ?? []).map((i) => i.title)]);

describe('menu samping (5E-1)', () => {
    it('admin melihat semua grup', () => {
        expect(titles(['admin']).map(([t]) => t)).toEqual([
            'Beranda',
            'Kasir',
            'Inventaris',
            'Laporan',
            'Anggota',
            'Admin',
        ]);
    });

    it('kasir hanya Beranda, Kasir, dan Produk di Inventaris', () => {
        expect(titles(['kasir'])).toEqual([
            ['Beranda', []],
            ['Kasir', ['Transaksi', 'Riwayat transaksi']],
            ['Inventaris', ['Produk']],
        ]);
    });

    it('bendahara hanya Beranda dan Anggota', () => {
        expect(titles(['bendahara'])).toEqual([
            ['Beranda', []],
            ['Anggota', []],
        ]);
    });

    it('tautan aktif memakai awalan jalur terpanjang', () => {
        const menu = menuFor(['admin']);

        expect(activeLink(menu, '/produk/3/ubah')?.link?.title).toBe('Produk');
        expect(activeLink(menu, '/kasir/penjualan')?.link?.title).toBe(
            'Riwayat transaksi',
        );
        expect(activeLink(menu, '/kasir')?.link?.title).toBe('Transaksi');
        expect(activeLink(menu, '/anggota/5')?.group.title).toBe('Anggota');
        expect(activeLink(menu, '/settings/profile')).toBeNull();
    });
});
