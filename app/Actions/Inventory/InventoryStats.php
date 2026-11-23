<?php

namespace App\Actions\Inventory;

use App\Actions\Reports\InventoryReport;
use App\Models\Product;

/**
 * Kartu angka di kepala halaman Inventaris (Tahap 5E-2). Hanya membaca: produk
 * aktif, stok dari ledger lewat Product::withStock, status dengan aturan yang
 * sama dengan laporan inventaris (InventoryReport::statusFor).
 *
 * - products: banyaknya produk aktif;
 * - units: jumlah stok tersedia (satuan dasar) dari produk yang stoknya > 0;
 * - low: produk menipis (0 < stok ≤ minimum);
 * - empty: produk habis (stok ≤ 0).
 *
 * low + empty = angka "Stok menipis" di Beranda (InventoryReport::lowStockCount).
 */
class InventoryStats
{
    /** @return array{products: int, units: int, low: int, empty: int} */
    public function handle(): array
    {
        $products = Product::query()
            ->where('is_active', true)
            ->withStock()
            ->get(['products.id', 'products.min_stock']);

        $status = fn (Product $p) => InventoryReport::statusFor((int) $p->stock, $p->min_stock);

        return [
            'products' => $products->count(),
            'units' => (int) $products->sum(fn (Product $p) => max(0, (int) $p->stock)),
            'low' => $products->filter(fn (Product $p) => $status($p) === 'menipis')->count(),
            'empty' => $products->filter(fn (Product $p) => $status($p) === 'kosong')->count(),
        ];
    }
}
