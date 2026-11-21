<?php

namespace Database\Factories;

use App\Models\ProductUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ProductUnit> */
class ProductUnitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'dus',
            'conversion' => 24,
            'is_base' => false,
            'sell_price' => 20000,
            'barcode' => null,
        ];
    }

    public function base(): static
    {
        return $this->state(['name' => 'pcs', 'conversion' => 1, 'is_base' => true, 'sell_price' => 1000]);
    }
}
