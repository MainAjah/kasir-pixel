<?php

namespace App\Http\Controllers\Api;

use App\Actions\Pos\CompleteSale;
use App\Enums\Role;
use App\Exceptions\PosException;
use App\Exceptions\StockException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\CompleteSaleRequest;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Checkout lewat REST API (Tahap 10), dipakai layar kasir dan klien lain.
 *
 * All-or-nothing: CompleteSale berjalan dalam satu transaksi database. Bila satu barang
 * gagal (misalnya stok barang ke-4 sudah habis dibeli lewat jalur lain), seluruh
 * keranjang di-rollback dan jawabannya 409 dengan barang yang gagal.
 */
class SaleController extends Controller
{
    public function store(CompleteSaleRequest $request, CompleteSale $action): JsonResponse
    {
        $data = $request->validated();

        try {
            $sale = $action->handle($request->user(), $data['items'], $data['tendered'], $data['member_id'] ?? null);
        } catch (StockException $e) {
            if (! $e->isInsufficient()) {
                return response()->json(['message' => $e->getMessage(), 'rolled_back' => true], 422);
            }

            return response()->json([
                'message' => $e->getMessage(),
                'rolled_back' => true,
                'failed_item' => [
                    'product_id' => $e->productId,
                    'product_name' => $e->productName,
                    'available' => $e->available,
                    'requested' => $e->requested,
                ],
            ], 409);
        } catch (PosException $e) {
            return response()->json(['message' => $e->getMessage(), 'rolled_back' => true], 422);
        }

        return response()->json(['data' => $this->present($sale)], 201);
    }

    /** Detail nota. Aturan sama dengan halaman struk: kasir miliknya sendiri, admin semua. */
    public function show(Request $request, Sale $sale): JsonResponse
    {
        abort_unless(
            $sale->created_by === $request->user()->id || $request->user()->hasRole(Role::Admin->value),
            403,
        );

        return response()->json(['data' => $this->present($sale)]);
    }

    /** @return array<string, mixed> */
    private function present(Sale $sale): array
    {
        $sale->loadMissing(['items', 'payments', 'cashier:id,name', 'void']);
        $payment = $sale->payments->first();

        return [
            'id' => $sale->id,
            'number' => $sale->number,
            'created_at' => $sale->created_at->timezone(config('app.display_timezone'))->format('Y-m-d H:i:s'),
            'cashier' => $sale->cashier?->name,
            'total' => $sale->total,
            'tendered' => $payment?->tendered,
            'change' => $payment?->change,
            'method' => $payment?->method->value,
            'is_voided' => $sale->void !== null,
            'items' => $sale->items->map(fn ($i) => [
                'product_id' => $i->product_id,
                'product_unit_id' => $i->product_unit_id,
                'name' => $i->product_name,
                'unit' => $i->unit_name,
                'qty' => $i->qty,
                'unit_price' => $i->unit_price,
                'line_total' => $i->line_total,
            ])->values(),
            'receipt_url' => route('pos.sales.receipt', $sale),
        ];
    }
}
