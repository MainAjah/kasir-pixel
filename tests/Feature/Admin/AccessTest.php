<?php

use App\Enums\Role;
use App\Models\User;
use App\Support\AccessMap;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role as SpatieRole;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->admin = User::factory()->create()->assignRole('admin');
});

test('halaman Hak akses hanya untuk admin', function (string $role) {
    $user = User::factory()->create()->assignRole($role);
    $target = User::factory()->create()->assignRole('kasir');

    $this->actingAs($user)->get(route('access.index'))->assertForbidden();
    $this->actingAs($user)->put(route('access.update', $target), ['role' => 'admin'])->assertForbidden();

    expect($target->fresh()->hasRole('kasir'))->toBeTrue();
})->with(['kasir', 'bendahara']);

test('admin melihat tiga peran yang ada, peta akses, dan daftar pengguna', function () {
    User::factory()->create()->assignRole('kasir');

    $this->actingAs($this->admin)
        ->get(route('access.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('hak-akses/index')
            ->has('roles', 3)
            ->where('roles.0.value', 'admin')
            ->has('rows', count(AccessMap::rows()))
            ->has('users', 2));

    expect(SpatieRole::count())->toBe(3);
});

test('peta akses jujur: sama dengan penjaga rute untuk setiap peran', function () {
    $users = collect(Role::cases())->mapWithKeys(fn (Role $r) => [
        $r->value => User::factory()->create()->assignRole($r->value),
    ]);

    foreach (AccessMap::rows() as $row) {
        if ($row['route'] === null) {
            continue;
        }

        $url = route($row['route'], $row['params']);

        foreach (Role::cases() as $role) {
            $status = $this->actingAs($users[$role->value])->get($url)->status();
            $allowed = in_array($role, $row['roles'], true);

            expect($status === 403)->toBe(! $allowed, "{$row['label']} untuk {$role->value}: status {$status}");
        }
    }
});

test('admin mengganti peran pengguna lewat halaman Hak akses', function () {
    $kasir = User::factory()->create()->assignRole('kasir');

    $this->actingAs($this->admin)
        ->put(route('access.update', $kasir), ['role' => 'bendahara'])
        ->assertRedirect();

    expect($kasir->fresh()->getRoleNames()->all())->toBe(['bendahara']);
});

test('aturan yang sama berlaku di halaman Hak akses: tidak bisa mengganti peran sendiri', function () {
    User::factory()->create()->assignRole('admin');

    $this->actingAs($this->admin)
        ->put(route('access.update', $this->admin), ['role' => 'kasir'])
        ->assertSessionHas('inertia.flash_data.toast.message', 'Anda tidak bisa mengubah peran sendiri.');

    expect($this->admin->fresh()->hasRole('admin'))->toBeTrue();
});

test('peran yang tidak ada ditolak di halaman Hak akses', function () {
    $kasir = User::factory()->create()->assignRole('kasir');

    $this->actingAs($this->admin)
        ->put(route('access.update', $kasir), ['role' => 'superadmin'])
        ->assertSessionHasErrors('role');

    expect(SpatieRole::count())->toBe(3)
        ->and($kasir->fresh()->hasRole('kasir'))->toBeTrue();
});
