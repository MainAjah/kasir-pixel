<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Models\CashShift;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Sale;
use App\Support\PosProduct;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    /** Layar kasir: bila belum ada shift aktif, halaman meminta kas awal. */
    public function index(Request $request): Response
    {
        $shift = CashShift::activeFor($request->user());

        return Inertia::render('kasir/index', [
            'shift' => $shift ? [
                'id' => $shift->id,
                'opened_at' => $shift->opened_at->timezone(config('app.display_timezone'))->format('d/m/Y H:i'),
                'opening_cash' => $shift->opening_cash,
                'sales_count' => Sale::where('cash_shift_id', $shift->id)->whereDoesntHave('void')->count(),
            ] : null,
            'cashier' => ['id' => $request->user()->id, 'name' => $request->user()->name],
            'catalog' => $shift ? $this->catalog() : [],
        ]);
    }

    /**
     * Katalog untuk grid produk (Tahap 5E-1): produk aktif dengan kategori, stok dari
     * ledger, dan semua satuannya (satuan dasar lebih dulu). Hanya baca; harga yang
     * dipakai saat bayar tetap dihitung ulang oleh server.
     *
     * @return list<array<string, mixed>>
     */
    private function catalog(): array
    {
        return Product::query()
            ->where('is_active', true)
            ->withStock()
            ->with(['category:id,name', 'units'])
            ->orderBy('name')
            ->get()
            ->map(function (Product $product) {
                $stock = (int) $product->stock;

                return [
                    'id' => $product->id,
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'category' => $product->category?->name,
                    'stock' => $stock,
                    'min_stock' => $product->min_stock,
                    'units' => $product->units
                        ->sortBy([['is_base', 'desc'], ['conversion', 'asc']])
                        ->values()
                        ->map(function (ProductUnit $unit) use ($product, $stock) {
                            $unit->setRelation('product', $product);

                            return PosProduct::unit($unit, $stock);
                        })
                        ->all(),
                ];
            })
            ->values()
            ->all();
    }
}
