<?php

namespace App\Http\Controllers\Api;

use App\Actions\Pos\PriceCart;
use App\Exceptions\PosException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CartPriceRequest;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

/**
 * Perhitungan total keranjang lewat REST API (Tahap 10). Tidak menulis apa pun dan
 * tidak butuh shift. Harga dari server lewat PriceCart, sama persis dengan checkout.
 * Info stok hanya peringatan: yang memutuskan tetap checkout di dalam transaksinya.
 */
class CartController extends Controller
{
    public function price(CartPriceRequest $request, PriceCart $priceCart): JsonResponse
    {
        try {
            ['lines' => $lines, 'total' => $total] = $priceCart->handle($request->validated('items'));
        } catch (PosException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $productIds = collect($lines)->map(fn ($l) => $l['product']->id)->unique()->values();
        $stock = Product::whereIn('id', $productIds)->withStock()->pluck('stock', 'id');

        // Satu produk bisa muncul di dua baris (misalnya pcs dan dus): kebutuhan dijumlah per produk.
        $needed = [];
        foreach ($lines as $l) {
            $needed[$l['product']->id] = ($needed[$l['product']->id] ?? 0) + $l['qty'] * $l['unit']->conversion;
        }

        return response()->json([
            'data' => [
                'items' => collect($lines)->map(function ($l) use ($stock, $needed) {
                    $available = (int) ($stock[$l['product']->id] ?? 0);

                    return [
                        'product_unit_id' => $l['unit']->id,
                        'product_id' => $l['product']->id,
                        'product_name' => $l['product']->name,
                        'unit_name' => $l['unit']->name,
                        'qty' => $l['qty'],
                        'base_qty' => $l['qty'] * $l['unit']->conversion,
                        'unit_price' => $l['unit']->sell_price,
                        'line_total' => $l['lineTotal'],
                        'stock_available' => $available,
                        'stock_enough' => $available >= $needed[$l['product']->id],
                    ];
                })->values(),
                'total' => $total,
                'all_stock_enough' => collect($needed)->every(fn ($qty, $id) => (int) ($stock[$id] ?? 0) >= $qty),
            ],
        ]);
    }
}
