<?php

namespace Database\Factories;

use App\Models\CashShift;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CashShift> */
class CashShiftFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'opened_at' => now(),
            'opening_cash' => 100000,
        ];
    }

    public function closed(): static
    {
        return $this->state(fn (array $a) => [
            'closed_at' => now(),
            'counted_cash' => $a['opening_cash'],
            'expected_cash' => $a['opening_cash'],
            'difference' => 0,
        ]);
    }
}
