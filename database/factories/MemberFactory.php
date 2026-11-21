<?php

namespace Database\Factories;

use App\Enums\MemberStatus;
use App\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Hanya untuk data tes. Anggota sungguhan dibuat lewat CreateMember.
 *
 * @extends Factory<Member>
 */
class MemberFactory extends Factory
{
    public function definition(): array
    {
        return [
            // Angka tinggi supaya tidak bentrok dengan nomor berurutan dari CreateMember (A-000001, ...).
            'member_number' => 'A-'.fake()->unique()->numberBetween(900000, 999999),
            'name' => fake()->name(),
            'phone' => fake()->numerify('08##########'),
            'address' => fake()->streetAddress(),
            'joined_at' => now()->timezone(config('app.display_timezone'))->toDateString(),
            'status' => MemberStatus::Active,
        ];
    }

    public function exited(): static
    {
        return $this->state(fn () => [
            'status' => MemberStatus::Exited,
            'exited_at' => now()->timezone(config('app.display_timezone'))->toDateString(),
        ]);
    }
}
