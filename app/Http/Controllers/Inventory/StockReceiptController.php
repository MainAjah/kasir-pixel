<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Inventory\InventoryStats;
use App\Actions\Inventory\ReceiveStock;
use App\Exceptions\StockException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockReceiptRequest;
use App\Models\StockEntry;
use App\Models\StockMovement;
use App\Models\Supplier;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class StockReceiptController extends Controller
{
    public function index(InventoryStats $stats): Response
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
                'from_master' => $e->supplier_id !== null,
                'note' => $e->note,
                'occurred_at' => $e->occurred_at->timezone(config('app.display_timezone'))->format('d/m/Y H:i'),
                'lines' => $e->movements_count,
                'by' => $e->creator?->name,
            ]);

        return Inertia::render('inventaris/penerimaan/index', [
            // Tahap 5E-2: tab Stok Masuk di halaman Inventaris memakai kepala yang sama.
            'stats' => $stats->handle(),
            'entries' => $entries,
        ]);
    }

    /**
     * Detail penerimaan (Tahap 5E-2): pemasok, tanggal, dan daftar barang yang
     * diterima. Hanya membaca mutasi ledger milik dokumen ini.
     */
    public function show(StockEntry $stockEntry): Response
    {
        $stockEntry->load([
            'supplier:id,name,contact,address,deleted_at',
            'creator:id,name',
            'movements' => fn ($q) => $q->orderBy('id'),
            'movements.product:id,sku,name,image_path,deleted_at',
            'movements.product.baseUnit:id,product_id,name',
            'movements.inputUnit:id,name,conversion',
        ]);

        $lines = $stockEntry->movements->map(fn (StockMovement $m) => [
            'id' => $m->id,
            'product' => $m->product?->name,
            'sku' => $m->product?->sku,
            'image_url' => $m->product?->imageUrl(),
            'input_qty' => $m->input_qty,
            'input_unit' => $m->inputUnit?->name,
            'conversion' => $m->inputUnit?->conversion,
            'qty' => $m->qty,
            'base_unit' => $m->product?->baseUnit?->name,
            'cost_total' => $m->cost_total,
        ])->values();

        return Inertia::render('inventaris/penerimaan/show', [
            'entry' => [
                'id' => $stockEntry->id,
                'number' => $stockEntry->number,
                'occurred_at' => $stockEntry->occurred_at->timezone(config('app.display_timezone'))->format('d/m/Y H:i'),
                'supplier_name' => $stockEntry->supplier_name,
                'supplier' => $stockEntry->supplier ? [
                    'name' => $stockEntry->supplier->name,
                    'contact' => $stockEntry->supplier->contact,
                    'address' => $stockEntry->supplier->address,
                ] : null,
                'note' => $stockEntry->note,
                'by' => $stockEntry->creator?->name,
                'lines' => $lines,
                // Nilai hanya dari baris yang harga belinya diisi.
                'total_cost' => (int) $stockEntry->movements->sum('cost_total'),
                'has_missing_cost' => $stockEntry->movements->contains(fn (StockMovement $m) => $m->cost_total === null),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('inventaris/penerimaan/create', [
            'products' => ProductOptions::all(),
            // Tahap 6B: hanya supplier aktif yang bisa dipilih.
            'suppliers' => Supplier::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
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
                isset($data['supplier_id']) ? (int) $data['supplier_id'] : null,
            );
        } catch (StockException $e) {
            return back()->withErrors(['lines' => $e->getMessage()])->withInput();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Penerimaan barang dicatat.']);

        return to_route('stock-receipts.index');
    }
}
