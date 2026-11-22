<?php

namespace App\Http\Controllers\Diorama;

use App\Actions\Pos\SimulateSale;
use App\Events\SaleCompleted;
use App\Exceptions\PosException;
use App\Exceptions\StockException;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/** Tombol "Simulasi pesanan" (Tahap 6, hanya admin): satu penjualan acak untuk demo. */
class SimulateSaleController extends Controller
{
    public function store(SimulateSale $action): RedirectResponse
    {
        try {
            $sale = $action->handle();
        } catch (PosException|StockException $e) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $e->getMessage()]);

            return back();
        }

        $sale->loadMissing('items');

        Inertia::flash('toast', ['type' => 'success', 'message' => "Pesanan simulasi {$sale->number} selesai."]);
        // Sama seperti layar kasir: diorama di halaman ini bergerak lewat pemancar peristiwa di browser.
        Inertia::flash('store_event', [
            'name' => SaleCompleted::name(),
            'detail' => [
                'number' => $sale->number,
                'total' => $sale->total,
                'items' => $sale->items->map(fn ($i) => ['name' => $i->product_name, 'unit' => $i->unit_name, 'qty' => $i->qty])->all(),
            ],
        ]);

        return back();
    }
}
