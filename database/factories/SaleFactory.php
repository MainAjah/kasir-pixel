<?php

namespace Database\Factories;

use App\Models\CashShift;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Hanya untuk data tes. Penjualan sungguhan dibuat lewat CompleteSale.
 *
 * @extends Factory<Sale>
 */
class SaleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'number' => 'INV-TES-'.fake()->unique()->numerify('######'),
            'cash_shift_id' => CashShift::factory(),
            'total' => 1000,
            'created_by' => fn (array $a) => CashShift::find($a['cash_shift_id'])->user_id,
        ];
    }
}
