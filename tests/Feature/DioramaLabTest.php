<?php

use App\Enums\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

test('admin membuka diorama lab', function () {
    $admin = User::factory()->create()->assignRole(Role::Admin->value);

    $this->actingAs($admin)
        ->get(route('diorama.lab'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('diorama-lab'));
});

test('kasir dan bendahara ditolak di diorama lab', function (Role $role) {
    $user = User::factory()->create()->assignRole($role->value);

    $this->actingAs($user)->get(route('diorama.lab'))->assertForbidden();
})->with([Role::Kasir, Role::Bendahara]);

test('tamu diarahkan ke halaman login dari diorama lab', function () {
    $this->get(route('diorama.lab'))->assertRedirect(route('login'));
});
