<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;

/**
 * Mutasi stok satu produk lewat REST API (Tahap 10, admin). Isi sama dengan kartu stok:
 * ledger hanya-tambah, terbaru di atas, dengan balance_after tiap baris.
 */
class StockMovementController extends Controller
{
    public function index(Product $product): JsonResponse
    {
        $reversedIds = StockMovement::where('product_id', $product->id)
            ->whereNotNull('reverses_movement_id')
            ->pluck('reverses_movement_id')
            ->all();

        $movements = StockMovement::query()
            ->where('product_id', $product->id)
            ->with(['inputUnit:id,name', 'creator:id,name', 'stockEntry:id,number', 'saleItem.sale:id,number'])
            ->orderByDesc('id')
            ->paginate(25)
            ->through(fn (StockMovement $m) => [
                'id' => $m->id,
                'occurred_at' => $m->occurred_at->timezone(config('app.display_timezone'))->format('Y-m-d H:i:s'),
                'type' => $m->type->value,
                'type_label' => $m->type->label(),
                'qty' => $m->qty,
                'input_qty' => $m->input_qty,
                'input_unit' => $m->inputUnit?->name,
                'balance_after' => $m->balance_after,
                'document' => $m->stockEntry?->number ?? $m->saleItem?->sale?->number,
                'note' => $m->note,
                'by' => $m->creator?->name,
                'is_reversal' => $m->reverses_movement_id !== null,
                'is_reversed' => in_array($m->id, $reversedIds, true),
            ]);

        return response()->json([
            'product' => [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'stock' => $product->currentStock(),
            ],
            'movements' => $movements,
        ]);
    }
}
