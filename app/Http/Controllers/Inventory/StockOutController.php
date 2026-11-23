<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Inventory\InventoryStats;
use App\Enums\StockMovementType;
use App\Http\Controllers\Controller;
use App\Models\StockMovement;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tab "Stok Keluar" di halaman Inventaris (Tahap 5E-2): mutasi ledger yang
 * mengurangi stok (penjualan dan koreksi minus), terbaru di atas. Hanya membaca;
 * khusus admin seperti Barang masuk.
 */
class StockOutController extends Controller
{
    public function index(InventoryStats $stats): Response
    {
        $reversedIds = StockMovement::query()
            ->whereNotNull('reverses_movement_id')
            ->pluck('reverses_movement_id')
            ->all();

        $movements = StockMovement::query()
            ->where('qty', '<', 0)
            ->whereIn('type', [StockMovementType::Sale, StockMovementType::Adjustment])
            ->with([
                'product:id,sku,name,image_path,deleted_at',
                'product.baseUnit:id,product_id,name',
                'inputUnit:id,name',
                'saleItem:id,sale_id',
                'saleItem.sale:id,number',
                'creator:id,name',
            ])
            ->orderByDesc('id')
            ->paginate(20)
            ->through(fn (StockMovement $m) => [
                'id' => $m->id,
                'occurred_at' => $m->occurred_at->timezone(config('app.display_timezone'))->format('d/m/Y H:i'),
                'type' => $m->type->value,
                'type_label' => $m->type->label(),
                'product' => $m->product?->name,
                'sku' => $m->product?->sku,
                'image_url' => $m->product?->imageUrl(),
                'qty' => $m->qty,
                'base_unit' => $m->product?->baseUnit?->name,
                'input_qty' => $m->input_qty,
                'input_unit' => $m->inputUnit?->name,
                'document' => $m->saleItem?->sale?->number,
                'note' => $m->note,
                'by' => $m->creator?->name,
                'is_reversed' => in_array($m->id, $reversedIds, true),
            ]);

        return Inertia::render('inventaris/stok-keluar', [
            'stats' => $stats->handle(),
            'movements' => $movements,
        ]);
    }
}
