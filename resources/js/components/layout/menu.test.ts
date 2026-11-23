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

    it('Tambah Produk di grup Kasir hanya untuk admin (6D)', () => {
        const kasirItems = (roles: string[]) =>
            menuFor(roles)
                .find((g) => g.title === 'Kasir')
                ?.items?.map((i) => i.title);

        expect(kasirItems(['admin'])).toEqual([
            'Transaksi',
            'Riwayat transaksi',
            'Tambah Produk',
        ]);
        expect(kasirItems(['kasir'])).not.toContain('Tambah Produk');

        const add = menuFor(['admin'])
            .find((g) => g.title === 'Kasir')
            ?.items?.find((i) => i.title === 'Tambah Produk');
        expect(add?.href).toBe('/produk/baru');
        expect(
            activeLink(menuFor(['admin']), '/produk/baru')?.link?.title,
        ).toBe('Tambah Produk');
        expect(
            activeLink(menuFor(['admin']), '/produk/3/ubah')?.link?.title,
        ).toBe('Produk');
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

    it('Beranda, Kasir, Inventaris, dan Laporan memakai ikon gambar pemilik', () => {
        const images = Object.fromEntries(
            menuFor(['admin']).map((g) => [g.title, g.image ?? null]),
        );

        expect(images.Beranda).toMatch(/beranda\.png/);
        expect(images.Kasir).toMatch(/kasir\.png/);
        expect(images.Inventaris).toMatch(/inventaris\.png/);
        expect(images.Laporan).toMatch(/laporan\.png/);
        expect(images.Anggota).toBeNull();
        expect(images.Admin).toBeNull();
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

        // Tab Stok Keluar (5E-2) menyalakan grup Inventaris tanpa sub-menu.
        const keluar = activeLink(menu, '/stok-keluar');
        expect(keluar?.group.title).toBe('Inventaris');
        expect(keluar?.link).toBeNull();
    });
});
