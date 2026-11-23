<?php

namespace App\Enums;

use App\Models\User;

/**
 * Pos di Beranda (Tahap 5D-2): siapa yang boleh membuka dan pilihan fiturnya.
 * Satu-satunya sumber aturan akses pos; dipakai Gate `open-post`.
 *
 * Peran yang boleh membuka pos sama dengan penjaga rute halaman tujuannya:
 * halaman kasir untuk kasir dan admin, halaman inventaris hanya admin. Bendahara
 * belum punya pos (pos Koperasi ditunda).
 */
enum Post: string
{
    case Kasir = 'kasir';
    case Inventaris = 'inventaris';

    public function label(): string
    {
        return match ($this) {
            self::Kasir => 'Kasir',
            self::Inventaris => 'Inventaris',
        };
    }

    /** @return list<Role> */
    public function roles(): array
    {
        return match ($this) {
            self::Kasir => [Role::Admin, Role::Kasir],
            self::Inventaris => [Role::Admin],
        };
    }

    public function allows(User $user): bool
    {
        return $user->hasAnyRole(array_map(fn (Role $role) => $role->value, $this->roles()));
    }

    /** Pesan singkat di diorama bila peran pengguna tidak boleh membuka pos ini. */
    public function deniedMessage(): string
    {
        $roles = array_map(fn (Role $role) => $role->label(), $this->roles());

        return "Pos {$this->label()} hanya untuk ".implode(' dan ', $roles).'.';
    }

    /**
     * Pilihan fitur: label dan nama rute tujuan. null = halamannya belum ada
     * (tampil nonaktif, "segera hadir"). `admin_only` (Tahap 6C): selain admin
     * melihat pilihan itu nonaktif dengan keterangan "khusus admin"; rutenya
     * sendiri tetap dijaga `role:admin` di server.
     *
     * @return list<array{label: string, route: string|null, admin_only?: bool}>
     */
    public function options(): array
    {
        return match ($this) {
            self::Kasir => [
                ['label' => 'Transaksi', 'route' => 'pos.index'],
                ['label' => 'Riwayat transaksi', 'route' => 'pos.sales.index'],
                ['label' => 'Laporan penjualan', 'route' => 'reports.sales', 'admin_only' => true],
                // Tahap 6D: form tambah produk (CRUD sejak Tahap 2), tetap khusus admin.
                ['label' => 'Tambah produk', 'route' => 'products.create', 'admin_only' => true],
            ],
            self::Inventaris => [
                ['label' => 'Stok barang', 'route' => 'products.index'],
                ['label' => 'Barang masuk', 'route' => 'stock-receipts.index'],
                ['label' => 'Penyesuaian stok', 'route' => 'stock-adjustments.create'],
                ['label' => 'Supplier', 'route' => 'suppliers.index'],
            ],
        };
    }
}
