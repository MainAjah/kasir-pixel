<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Inventory\ReceiveStock;
use App\Exceptions\StockException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockReceiptRequest;
use App\Models\StockEntry;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class StockReceiptController extends Controller
{
    public function index(): Response
    {
        $entries = StockEntry::query()
            ->withCount('movements')
            ->with('creator:id,name')
            ->orderByDesc('id')
            ->paginate(20)
            ->through(fn (StockEntry $e) => [
                'id' => $e->id,
                'number' => $e->number,
                'supplier_name' => $e->supplier_name,
                'note' => $e->note,
                'occurred_at' => $e->occurred_at->timezone(config('app.display_timezone'))->format('d/m/Y H:i'),
                'lines' => $e->movements_count,
                'by' => $e->creator?->name,
            ]);

        return Inertia::render('inventaris/penerimaan/index', ['entries' => $entries]);
    }

    public function create(): Response
    {
        return Inertia::render('inventaris/penerimaan/create', [
            'products' => ProductOptions::all(),
        ]);
    }

    public function store(StockReceiptRequest $request, ReceiveStock $action): RedirectResponse
    {
        $data = $request->validated();

        try {
            $action->handle(
                $request->user()->id,
                $data['lines'],
                $data['supplier_name'] ?? null,
                $data['note'] ?? null,
                isset($data['occurred_at']) ? Carbon::parse($data['occurred_at'], config('app.display_timezone')) : null,
            );
        } catch (StockException $e) {
            return back()->withErrors(['lines' => $e->getMessage()])->withInput();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Penerimaan barang dicatat.']);

        return to_route('stock-receipts.index');
    }
}
