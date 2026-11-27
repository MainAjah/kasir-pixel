<?php

/*
| Tahap HD-2D B1: lab komponen, sama seperti lab diorama: hanya admin, data
| contoh di halaman saja, tidak membaca atau menulis database.
*/

use App\Enums\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

test('admin membuka lab komponen HD-2D', function () {
    $admin = User::factory()->create()->assignRole(Role::Admin->value);

    $this->actingAs($admin)
        ->get(route('hd2d.lab'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('hd2d-lab'));
});

test('kasir dan bendahara ditolak di lab komponen HD-2D', function (Role $role) {
    $user = User::factory()->create()->assignRole($role->value);

    $this->actingAs($user)->get(route('hd2d.lab'))->assertForbidden();
})->with([Role::Kasir, Role::Bendahara]);

test('tamu diarahkan ke halaman login dari lab komponen HD-2D', function () {
    $this->get(route('hd2d.lab'))->assertRedirect(route('login'));
});
