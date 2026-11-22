<?php

namespace App\Support;

use App\Enums\Post;
use App\Enums\Role;

/**
 * Peta hak akses yang ditampilkan di halaman Hak akses (Tahap 6B, keputusan
 * pemilik: tabel dari kode, tanpa permission baru di database).
 *
 * Penjaga sungguhan tetap middleware peran di rute dan Gate `open-post`.
 * Tes AccessTest memastikan peta ini sama dengan penjaga itu: untuk tiap baris
 * yang punya rute GET, peran yang tercantum tidak ditolak dan peran lain ditolak.
 */
class AccessMap
{
    /**
     * @return list<array{key: string, label: string, roles: list<Role>, route: string|null, params: array<string, string>}>
     */
    public static function rows(): array
    {
        $all = Role::cases();
        $admin = [Role::Admin];

        return [
            self::row('beranda', 'Beranda dan diorama', $all, 'dashboard'),
            self::row('pos-kasir', 'Pos Kasir di Beranda', Post::Kasir->roles(), 'dashboard.post', ['post' => 'kasir']),
            self::row('pos-inventaris', 'Pos Inventaris di Beranda', Post::Inventaris->roles(), 'dashboard.post', ['post' => 'inventaris']),
            self::row('transaksi', 'Transaksi kasir', [Role::Admin, Role::Kasir], 'pos.index'),
            self::row('riwayat', 'Riwayat penjualan', [Role::Admin, Role::Kasir], 'pos.sales.index'),
            self::row('batal', 'Batalkan penjualan', $admin, null),
            self::row('produk-lihat', 'Lihat daftar produk dan stok', [Role::Admin, Role::Kasir], 'products.index'),
            self::row('produk-kelola', 'Tambah dan ubah produk', $admin, 'products.create'),
            self::row('kategori', 'Kategori', $admin, 'categories.index'),
            self::row('barang-masuk', 'Barang masuk', $admin, 'stock-receipts.index'),
            self::row('penyesuaian', 'Penyesuaian stok', $admin, 'stock-adjustments.create'),
            self::row('supplier', 'Supplier', $admin, 'suppliers.index'),
            self::row('anggota', 'Anggota dan simpanan', [Role::Admin, Role::Bendahara], 'members.index'),
            self::row('pengguna', 'Kelola pengguna', $admin, 'users.index'),
            self::row('hak-akses', 'Hak akses', $admin, 'access.index'),
            self::row('laporan-penjualan', 'Laporan penjualan', $admin, 'reports.sales'),
            self::row('laporan-inventaris', 'Laporan inventaris', $admin, 'reports.inventory'),
            self::row('lab', 'Diorama lab dan simulasi pesanan', $admin, 'diorama.lab'),
        ];
    }

    /**
     * @param  list<Role>  $roles
     * @param  array<string, string>  $params
     * @return array{key: string, label: string, roles: list<Role>, route: string|null, params: array<string, string>}
     */
    private static function row(string $key, string $label, array $roles, ?string $route, array $params = []): array
    {
        return compact('key', 'label', 'roles', 'route', 'params');
    }
}
