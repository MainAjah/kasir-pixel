<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Activity\LogActivity;
use App\Actions\Inventory\AdjustStock;
use App\Enums\StockMovementType;
use App\Exceptions\StockException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockAdjustmentRequest;
use App\Models\Product;
use App\Models\ProductUnit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockAdjustmentController extends Controller
{
    public function create(Request $request): Response
    {
        $products = ProductOptions::all();

        return Inertia::render('inventaris/koreksi-stok/create', [
            'products' => $products,
            'selected_product_id' => $request->integer('produk') ?: null,
        ]);
    }

    public function store(StockAdjustmentRequest $request, AdjustStock $adjustStock, LogActivity $log): RedirectResponse
    {
        $data = $request->validated();

        $product = Product::findOrFail($data['product_id']);
        $unit = ProductUnit::findOrFail($data['product_unit_id']);

        $type = $data['kind'] === 'opening' ? StockMovementType::Opening : StockMovementType::Adjustment;
        $qty = $data['kind'] === 'decrease' ? -$data['qty'] : $data['qty'];

        try {
            $movement = $adjustStock->handle(
                $product,
                $type,
                $unit,
                $qty,
                $request->user()->id,
                note: $data['note'] ?? null,
                costTotal: $type === StockMovementType::Opening ? ($data['cost_total'] ?? null) : null,
            );
        } catch (StockException $e) {
            return back()->withErrors(['qty' => $e->getMessage()])->withInput();
        }

        if ($type === StockMovementType::Adjustment) {
            $log->handle('stock.adjusted', $product, [
                'qty' => $movement->qty,
                'balance_after' => $movement->balance_after,
                'note' => $movement->note,
            ], $request->user()->id);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Stok dicatat.']);

        return to_route('products.stock-card', $product);
    }
}
