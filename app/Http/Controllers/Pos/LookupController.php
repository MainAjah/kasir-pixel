<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Support\PosProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pencarian barang untuk layar kasir. Hanya baca, hanya produk aktif.
 */
class LookupController extends Controller
{
    /** Scanner USB: satu barcode menunjuk satu satuan (barcode dus menghasilkan satuan dus). */
    public function barcode(string $barcode): JsonResponse
    {
        $unit = ProductUnit::query()
            ->with('product')
            ->where('barcode', $barcode)
            ->whereHas('product', fn ($q) => $q->where('is_active', true))
            ->first();

        if ($unit === null) {
            return response()->json(['message' => "Barcode {$barcode} tidak ditemukan."], 404);
        }

        return response()->json(PosProduct::unit($unit));
    }

    /** Pencarian manual: nama, SKU, atau barcode. Hasil per produk dengan semua satuannya. */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if ($q === '') {
            return response()->json([]);
        }

        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q).'%';

        $products = Product::query()
            ->where('is_active', true)
            ->where(function ($query) use ($like, $q) {
                $query->where('name', 'like', $like)
                    ->orWhere('sku', 'like', $like)
                    ->orWhereHas('units', fn ($u) => $u->where('barcode', $q));
            })
            ->with('units.product')
            ->orderBy('name')
            ->limit(10)
            ->get();

        return response()->json($products->map(fn (Product $p) => [
            'id' => $p->id,
            'sku' => $p->sku,
            'name' => $p->name,
            'units' => $p->units->sortByDesc('is_base')->values()->map(fn (ProductUnit $u) => PosProduct::unit($u)),
        ])->values());
    }
}
