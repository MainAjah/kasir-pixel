<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Akun demo untuk pengembangan lokal. Kata sandi semua akun: "password".
     */
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        $demo = [
            Role::Admin->value => ['name' => 'Admin Koperasi', 'email' => 'admin@kasir.test'],
            Role::Kasir->value => ['name' => 'Kasir Satu', 'email' => 'kasir@kasir.test'],
            Role::Bendahara->value => ['name' => 'Bendahara', 'email' => 'bendahara@kasir.test'],
        ];

        foreach ($demo as $role => $attributes) {
            User::factory()
                ->create($attributes)
                ->assignRole($role);
        }
    }
}
