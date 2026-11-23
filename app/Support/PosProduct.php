<?php

namespace App\Support;

use App\Models\ProductUnit;

/**
 * Bentuk data produk untuk layar kasir (pencarian dan barcode). Hanya baca.
 */
class PosProduct
{
    /**
     * @param  int|null  $stock  Stok satuan dasar yang sudah diketahui (misalnya dari scope withStock);
     *                           null berarti dibaca dari ledger.
     * @return array<string, mixed>
     */
    public static function unit(ProductUnit $unit, ?int $stock = null): array
    {
        $product = $unit->product;
        $stock ??= $product->currentStock();

        return [
            'product_unit_id' => $unit->id,
            'product_id' => $product->id,
            'sku' => $product->sku,
            'product_name' => $product->name,
            'unit_name' => $unit->name,
            'conversion' => $unit->conversion,
            'price' => $unit->sell_price,
            'barcode' => $unit->barcode,
            // Stok dalam satuan dasar dan dalam satuan ini (dibulatkan ke bawah). Hanya peringatan;
            // yang memutuskan tetap server saat bayar.
            'stock_base' => $stock,
            'stock_units' => intdiv($stock, $unit->conversion),
        ];
    }
}
