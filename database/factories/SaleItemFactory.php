<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Hanya untuk data tes. Tidak mengubah stok; gunakan CompleteSale untuk alur sungguhan.
 *
 * @extends Factory<SaleItem>
 */
class SaleItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'sale_id' => Sale::factory(),
            'product_id' => Product::factory(),
            'product_unit_id' => fn (array $a) => Product::find($a['product_id'])->baseUnit->id,
            'product_name' => fn (array $a) => Product::find($a['product_id'])->name,
            'unit_name' => 'pcs',
            'conversion' => 1,
            'qty' => 1,
            'base_qty' => 1,
            'unit_price' => 1000,
            'line_total' => 1000,
        ];
    }
}
