<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Inertia\Inertia;
use Inertia\Response;

class StockCardController extends Controller
{
    /** Kartu stok: seluruh mutasi satu produk, terbaru di atas. */
    public function show(Product $product): Response
    {
        $reversedIds = StockMovement::where('product_id', $product->id)
            ->whereNotNull('reverses_movement_id')
            ->pluck('reverses_movement_id')
            ->all();

        $movements = StockMovement::query()
            ->where('product_id', $product->id)
            ->with(['inputUnit:id,name', 'creator:id,name', 'stockEntry:id,number'])
            ->orderByDesc('id')
            ->paginate(25)
            ->through(fn (StockMovement $m) => [
                'id' => $m->id,
                'occurred_at' => $m->occurred_at->timezone(config('app.display_timezone'))->format('d/m/Y H:i'),
                'type' => $m->type->label(),
                'qty' => $m->qty,
                'input_qty' => $m->input_qty,
                'unit' => $m->inputUnit?->name,
                'balance_after' => $m->balance_after,
                'note' => $m->note,
                'document' => $m->stockEntry?->number,
                'by' => $m->creator?->name,
                'is_reversal' => $m->reverses_movement_id !== null,
                'is_reversed' => in_array($m->id, $reversedIds, true),
            ]);

        return Inertia::render('inventaris/produk/kartu-stok', [
            'product' => [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'min_stock' => $product->min_stock,
                'stock' => $product->currentStock(),
                'base_unit' => $product->baseUnit?->name,
            ],
            'movements' => $movements,
        ]);
    }
}
