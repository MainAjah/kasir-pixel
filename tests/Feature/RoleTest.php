<?php

use App\Enums\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role as RoleModel;

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    // Rute uji yang hanya ada selama tes, untuk memeriksa middleware peran.
    Route::middleware(['web', 'auth', 'role:admin'])->get('/_uji/admin', fn () => 'ok-admin');
    Route::middleware(['web', 'auth', 'role:kasir|admin'])->get('/_uji/kasir', fn () => 'ok-kasir');
});

test('seeder membuat tepat tiga peran', function () {
    expect(RoleModel::pluck('name')->sort()->values()->all())
        ->toBe(['admin', 'bendahara', 'kasir']);
});

test('RoleSeeder aman dijalankan dua kali', function () {
    $this->seed(RoleSeeder::class);

    expect(RoleModel::count())->toBe(3);
});

test('DatabaseSeeder membuat satu akun demo untuk setiap peran', function () {
    $this->seed(DatabaseSeeder::class);

    foreach (Role::cases() as $role) {
        expect(User::role($role->value)->count())->toBe(1);
    }
});

test('admin boleh membuka rute admin', function () {
    $admin = User::factory()->create()->assignRole(Role::Admin->value);

    $this->actingAs($admin)->get('/_uji/admin')->assertOk()->assertSee('ok-admin');
});

test('kasir dan bendahara ditolak di rute admin', function (Role $role) {
    $user = User::factory()->create()->assignRole($role->value);

    $this->actingAs($user)->get('/_uji/admin')->assertForbidden();
})->with([Role::Kasir, Role::Bendahara]);

test('rute dengan beberapa peran menerima salah satunya', function () {
    $kasir = User::factory()->create()->assignRole(Role::Kasir->value);
    $bendahara = User::factory()->create()->assignRole(Role::Bendahara->value);

    $this->actingAs($kasir)->get('/_uji/kasir')->assertOk();
    $this->actingAs($bendahara)->get('/_uji/kasir')->assertForbidden();
});

test('tamu diarahkan ke halaman login', function () {
    $this->get('/_uji/admin')->assertRedirect(route('login'));
});

test('akun nonaktif tidak bisa login', function () {
    $user = User::factory()->create(['is_active' => false]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
});

test('akun yang dinonaktifkan saat masih login dikeluarkan', function () {
    $user = User::factory()->create()->assignRole(Role::Kasir->value);
    $this->actingAs($user);

    $user->forceFill(['is_active' => false])->save();

    $this->get(route('dashboard'))->assertRedirect(route('login'));
    $this->assertGuest();
});

test('akun yang dihapus (soft delete) tidak bisa login', function () {
    $user = User::factory()->create();
    $user->delete();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();
    expect(User::withTrashed()->find($user->id))->not->toBeNull();
});

test('peran pengguna dibagikan ke halaman Inertia', function () {
    $user = User::factory()->create()->assignRole(Role::Bendahara->value);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('auth.roles', ['bendahara']));
});
