<?php

namespace App\Http\Controllers\Inventory;

use App\Models\Product;

/**
 * Daftar produk aktif beserta satuannya untuk pilihan di formulir stok.
 */
class ProductOptions
{
    /** @return array<int, array<string, mixed>> */
    public static function all(): array
    {
        return Product::query()
            ->where('is_active', true)
            ->with('units:id,product_id,name,conversion,is_base')
            ->orderBy('name')
            ->get(['id', 'sku', 'name'])
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'units' => $p->units->sortByDesc('is_base')->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'conversion' => $u->conversion,
                ])->values(),
            ])
            ->all();
    }
}
