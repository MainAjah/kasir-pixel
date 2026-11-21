<?php

namespace App\Http\Controllers\Pos;

use App\Actions\Pos\CompleteSale;
use App\Actions\Pos\VoidSale;
use App\Enums\Role;
use App\Events\SaleCompleted;
use App\Events\SaleVoided;
use App\Exceptions\PosException;
use App\Exceptions\StockException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\CompleteSaleRequest;
use App\Http\Requests\Pos\VoidSaleRequest;
use App\Models\Sale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    public function store(CompleteSaleRequest $request, CompleteSale $action): RedirectResponse
    {
        $data = $request->validated();

        try {
            $sale = $action->handle($request->user(), $data['items'], $data['tendered']);
        } catch (PosException|StockException $e) {
            // Keranjang tetap ada di browser; kasir bisa memperbaikinya.
            return back()->withErrors(['cart' => $e->getMessage()]);
        }

        // Kasir yang bersangkutan menggerakkan diorama langsung dari browser (tanpa menunggu Reverb).
        Inertia::flash('store_event', [
            'name' => SaleCompleted::name(),
            'detail' => [
                'number' => $sale->number,
                'total' => $sale->total,
                'items' => $sale->items->map(fn ($i) => ['name' => $i->product_name, 'unit' => $i->unit_name, 'qty' => $i->qty])->all(),
            ],
        ]);

        return to_route('pos.sales.receipt', $sale);
    }

    /**
     * Riwayat penjualan. Kasir: miliknya sendiri. Admin: semua penjualan di shift yang masih terbuka
     * (tempat membatalkan; shift yang sudah tutup tidak bisa dibatalkan).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->hasRole(Role::Admin->value);
        $tz = config('app.display_timezone');

        $sales = Sale::query()
            ->with(['cashier:id,name', 'cashShift:id,closed_at', 'void:id,sale_id,reason'])
            ->withCount('items')
            ->when($isAdmin,
                fn ($q) => $q->whereHas('cashShift', fn ($s) => $s->whereNull('closed_at')),
                fn ($q) => $q->where('created_by', $user->id))
            ->orderByDesc('id')
            ->paginate(20)
            ->through(fn (Sale $s) => [
                'id' => $s->id,
                'number' => $s->number,
                'time' => $s->created_at->timezone($tz)->format('d/m/Y H:i'),
                'total' => $s->total,
                'items_count' => $s->items_count,
                'cashier' => $s->cashier?->name,
                'is_voided' => $s->void !== null,
                'void_reason' => $s->void?->reason,
                'can_void' => $isAdmin && $s->void === null && $s->cashShift->closed_at === null,
            ]);

        return Inertia::render('kasir/riwayat', [
            'sales' => $sales,
            'scope' => $isAdmin ? 'admin' : 'kasir',
        ]);
    }

    public function receipt(Request $request, Sale $sale): Response
    {
        abort_unless(
            $sale->created_by === $request->user()->id || $request->user()->hasRole(Role::Admin->value),
            403,
        );

        $sale->load(['items', 'payments', 'cashier:id,name', 'void']);
        $payment = $sale->payments->first();

        return Inertia::render('kasir/struk', [
            'store_name' => config('app.name'),
            'sale' => [
                'number' => $sale->number,
                'time' => $sale->created_at->timezone(config('app.display_timezone'))->format('d/m/Y H:i'),
                'cashier' => $sale->cashier?->name,
                'total' => $sale->total,
                'tendered' => $payment?->tendered,
                'change' => $payment?->change,
                'method' => $payment?->method->label(),
                'is_voided' => $sale->void !== null,
                'void_reason' => $sale->void?->reason,
                'items' => $sale->items->map(fn ($i) => [
                    'name' => $i->product_name,
                    'unit' => $i->unit_name,
                    'qty' => $i->qty,
                    'unit_price' => $i->unit_price,
                    'line_total' => $i->line_total,
                ])->values(),
            ],
        ]);
    }

    public function void(VoidSaleRequest $request, Sale $sale, VoidSale $action): RedirectResponse
    {
        try {
            $action->handle($sale, $request->user(), $request->validated('reason'));
        } catch (PosException|StockException $e) {
            return back()->withErrors(['reason' => $e->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "Penjualan {$sale->number} dibatalkan."]);
        Inertia::flash('store_event', [
            'name' => SaleVoided::name(),
            'detail' => ['number' => $sale->number, 'total' => $sale->total],
        ]);

        return to_route('pos.sales.index');
    }
}
