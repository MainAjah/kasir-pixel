<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Product> */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'sku' => fake()->unique()->bothify('SKU-#####'),
            'name' => fake()->unique()->words(2, true),
            'category_id' => null,
            'min_stock' => 0,
            'is_active' => true,
        ];
    }

    /** Setiap produk otomatis punya satuan dasar "pcs" (isi 1, Rp 1.000). */
    public function configure(): static
    {
        return $this->afterCreating(function (Product $product) {
            if (! $product->units()->exists()) {
                ProductUnit::factory()->for($product)->base()->create();
            }
        });
    }
}
