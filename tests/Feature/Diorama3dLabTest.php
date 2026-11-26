<?php

/*
| Tahap 5H: lab diorama 3D, sama seperti diorama lab: hanya admin, tidak membaca
| atau menulis data. Beranda dan /diorama-lab tidak berubah.
*/

use App\Enums\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

test('admin membuka diorama 3D lab', function () {
    $admin = User::factory()->create()->assignRole(Role::Admin->value);

    $this->actingAs($admin)
        ->get(route('diorama.lab3d'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('diorama-3d-lab'));
});

test('kasir dan bendahara ditolak di diorama 3D lab', function (Role $role) {
    $user = User::factory()->create()->assignRole($role->value);

    $this->actingAs($user)->get(route('diorama.lab3d'))->assertForbidden();
})->with([Role::Kasir, Role::Bendahara]);

test('tamu diarahkan ke halaman login dari diorama 3D lab', function () {
    $this->get(route('diorama.lab3d'))->assertRedirect(route('login'));
});
