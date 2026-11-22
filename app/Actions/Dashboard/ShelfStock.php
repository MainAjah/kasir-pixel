<?php

namespace App\Actions\Dashboard;

use App\Models\Product;

/**
 * Tingkat isi rak dan vending diorama menurut stok nyata (Tahap 5D-1, disetujui
 * pemilik 22 Nov 2026). Hanya membaca.
 *
 * Batas per produk (satuan dasar), patokannya stok minimum produk itu:
 * - kosong:   stok 0 (atau kurang);
 * - sedikit:  1 sampai stok minimum (sama dengan "stok menipis" di kartu Hari Ini);
 * - setengah: di atas minimum, paling banyak 3× minimum;
 * - penuh:    lebih dari 3× minimum.
 * Produk dengan stok minimum 0 memakai patokan 5. Produk nonaktif tidak ikut.
 *
 * Produk kategori "Minuman" masuk vending (urut nama); produk lain masuk rak
 * (urut kategori lalu nama, tanpa kategori di akhir). Pembagian ke potongan rak
 * dan mesin vending dikerjakan diorama, karena hanya diorama yang tahu denahnya.
 */
class ShelfStock
{
    public const VENDING_CATEGORY = 'Minuman';

    public const FULL_MULTIPLIER = 3;

    public const FALLBACK_MIN = 5;

    /** Urutan tingkat isi, dari kosong ke penuh (sama dengan RackFill di diorama). */
    public const LEVELS = ['kosong', 'sedikit', 'setengah', 'penuh'];

    public static function levelFor(int $stock, int $minStock): string
    {
        $base = $minStock > 0 ? $minStock : self::FALLBACK_MIN;

        return match (true) {
            $stock <= 0 => 'kosong',
            $stock <= $base => 'sedikit',
            $stock <= $base * self::FULL_MULTIPLIER => 'setengah',
            default => 'penuh',
        };
    }

    /** @return array{rak: list<string>, vending: list<string>} */
    public function handle(): array
    {
        $products = Product::query()
            ->withStock()
            ->with('category:id,name')
            ->where('is_active', true)
            ->get(['id', 'name', 'category_id', 'min_stock'])
            ->sort(function (Product $a, Product $b) {
                $key = fn (Product $p) => [
                    $p->category === null ? 1 : 0,
                    mb_strtolower($p->category->name ?? ''),
                    mb_strtolower($p->name),
                    $p->id,
                ];

                return $key($a) <=> $key($b);
            });

        $rak = [];
        $vending = [];

        foreach ($products as $product) {
            $level = self::levelFor((int) ($product->stock ?? 0), $product->min_stock);

            if ($product->category?->name === self::VENDING_CATEGORY) {
                $vending[] = $level;
            } else {
                $rak[] = $level;
            }
        }

        return ['rak' => $rak, 'vending' => $vending];
    }
}
