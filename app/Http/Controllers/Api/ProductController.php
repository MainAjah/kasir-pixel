<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Support\PosProduct;
use Illuminate\Http\JsonResponse;

/**
 * Database inventaris lewat REST API (Tahap 10). Hanya baca, hanya produk aktif.
 * Stok dari ledger (Product::withStock), satuan dalam bentuk yang sama dengan layar kasir.
 */
class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        $products = Product::query()
            ->where('is_active', true)
            ->withStock()
            ->with(['category:id,name', 'units'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $products->map(fn (Product $p) => $this->present($p))->values()]);
    }

    public function show(int $product): JsonResponse
    {
        $found = Product::query()
            ->whereKey($product)
            ->where('is_active', true)
            ->withStock()
            ->with(['category:id,name', 'units'])
            ->firstOrFail();

        return response()->json(['data' => $this->present($found)]);
    }

    /** @return array<string, mixed> */
    private function present(Product $p): array
    {
        $stock = (int) $p->stock;

        return [
            'id' => $p->id,
            'sku' => $p->sku,
            'name' => $p->name,
            'category' => $p->category?->name,
            'stock' => $stock,
            'min_stock' => $p->min_stock,
            'image_url' => $p->imageUrl(),
            'units' => $p->units
                ->sortByDesc('is_base')
                ->values()
                ->map(fn (ProductUnit $u) => PosProduct::unit($u->setRelation('product', $p), $stock)),
        ];
    }
}
