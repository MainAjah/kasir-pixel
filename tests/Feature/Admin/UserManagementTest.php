<?php

use App\Actions\Users\ChangeUserRole;
use App\Actions\Users\SetUserActive;
use App\Enums\Role;
use App\Exceptions\UserException;
use App\Models\ActivityLog;
use App\Models\CashShift;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role as SpatieRole;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Satu'])->assignRole('admin');
});

function pengguna(string $role, array $attrs = []): User
{
    return User::factory()->create($attrs)->assignRole($role);
}

// --- Akses ----------------------------------------------------------------------

test('hanya admin yang bisa membuka dan memakai kelola pengguna', function (string $role) {
    $user = pengguna($role);
    $target = pengguna('kasir');

    $this->actingAs($user);
    $this->get(route('users.index'))->assertForbidden();
    $this->get(route('users.create'))->assertForbidden();
    $this->post(route('users.store'), [])->assertForbidden();
    $this->get(route('users.edit', $target))->assertForbidden();
    $this->put(route('users.update', $target), [])->assertForbidden();
    $this->post(route('users.deactivate', $target))->assertForbidden();
    $this->post(route('users.activate', $target))->assertForbidden();

    expect($target->fresh()->is_active)->toBeTrue();
})->with(['kasir', 'bendahara']);

test('tamu diarahkan ke halaman masuk', function () {
    $this->get(route('users.index'))->assertRedirect(route('login'));
});

// --- Tambah dan ubah ------------------------------------------------------------

test('admin melihat daftar pengguna', function () {
    pengguna('kasir', ['name' => 'Kasir Dua']);

    $this->actingAs($this->admin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('pengguna/index')
            ->has('users.data', 2));
});

test('admin menambah pengguna dengan peran yang ada', function () {
    $this->actingAs($this->admin)
        ->post(route('users.store'), [
            'name' => 'Kasir Baru',
            'email' => 'baru@kasir.test',
            'role' => 'kasir',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ])
        ->assertRedirect(route('users.index'));

    $user = User::where('email', 'baru@kasir.test')->first();

    expect($user->hasRole('kasir'))->toBeTrue()
        ->and($user->is_active)->toBeTrue()
        ->and(Hash::check('rahasia123', $user->password))->toBeTrue()
        ->and(ActivityLog::where('action', 'user.created')->exists())->toBeTrue();
});

test('peran yang tidak ada ditolak dan tidak pernah dibuat', function () {
    $this->actingAs($this->admin)
        ->post(route('users.store'), [
            'name' => 'X',
            'email' => 'x@kasir.test',
            'role' => 'pengawas',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ])
        ->assertSessionHasErrors('role');

    expect(SpatieRole::count())->toBe(3)
        ->and(User::where('email', 'x@kasir.test')->exists())->toBeFalse();
});

test('email harus unik dan kata sandi wajib saat menambah', function () {
    pengguna('kasir', ['email' => 'sama@kasir.test']);

    $this->actingAs($this->admin)
        ->post(route('users.store'), ['name' => 'Y', 'email' => 'sama@kasir.test', 'role' => 'kasir'])
        ->assertSessionHasErrors(['email', 'password']);
});

test('admin mengubah nama, email, peran, dan kata sandi pengguna lain', function () {
    $kasir = pengguna('kasir', ['password' => 'lamasekali']);

    $this->actingAs($this->admin)
        ->put(route('users.update', $kasir), [
            'name' => 'Nama Baru',
            'email' => 'nama.baru@kasir.test',
            'role' => 'bendahara',
            'password' => 'barusekali',
            'password_confirmation' => 'barusekali',
        ])
        ->assertRedirect(route('users.index'));

    $kasir->refresh();

    expect($kasir->name)->toBe('Nama Baru')
        ->and($kasir->getRoleNames()->all())->toBe(['bendahara'])
        ->and(Hash::check('barusekali', $kasir->password))->toBeTrue()
        ->and(ActivityLog::where('action', 'user.role_changed')->exists())->toBeTrue();
});

test('kata sandi kosong saat mengubah berarti tidak diganti', function () {
    $kasir = pengguna('kasir', ['password' => 'tetapsama']);

    $this->actingAs($this->admin)->put(route('users.update', $kasir), [
        'name' => $kasir->name, 'email' => $kasir->email, 'role' => 'kasir', 'password' => '',
    ])->assertRedirect(route('users.index'));

    expect(Hash::check('tetapsama', $kasir->fresh()->password))->toBeTrue();
});

// --- Aturan peran ---------------------------------------------------------------

test('admin tidak bisa mengubah perannya sendiri', function () {
    pengguna('admin'); // masih ada admin lain

    $this->actingAs($this->admin)
        ->put(route('users.update', $this->admin), [
            'name' => $this->admin->name, 'email' => $this->admin->email, 'role' => 'kasir',
        ])
        ->assertSessionHasErrors(['role' => 'Anda tidak bisa mengubah peran sendiri.']);

    expect($this->admin->fresh()->hasRole('admin'))->toBeTrue();
});

test('admin lain boleh diturunkan perannya selama masih ada admin aktif lain', function () {
    $kedua = pengguna('admin');

    $this->actingAs($this->admin)
        ->put(route('users.update', $kedua), ['name' => $kedua->name, 'email' => $kedua->email, 'role' => 'kasir'])
        ->assertRedirect(route('users.index'));

    expect($kedua->fresh()->hasRole('kasir'))->toBeTrue();
    expect(User::role('admin')->where('is_active', true)->count())->toBe(1);
});

test('admin terakhir tidak bisa diturunkan perannya', function () {
    // Satu-satunya admin aktif diturunkan oleh admin nonaktif (diuji lewat Action).
    $nonaktif = pengguna('admin', ['is_active' => false]);

    expect(fn () => app(ChangeUserRole::class)->handle($this->admin, Role::Kasir, $nonaktif))
        ->toThrow(UserException::class, 'Harus tetap ada minimal satu admin aktif.');

    expect($this->admin->fresh()->hasRole('admin'))->toBeTrue();
});

// --- Nonaktifkan ----------------------------------------------------------------

test('admin menonaktifkan dan mengaktifkan lagi pengguna lain', function () {
    $kasir = pengguna('kasir');

    $this->actingAs($this->admin)->post(route('users.deactivate', $kasir))->assertRedirect();
    expect($kasir->fresh()->is_active)->toBeFalse()
        ->and(User::withTrashed()->find($kasir->id)->trashed())->toBeFalse();

    $this->actingAs($this->admin)->post(route('users.activate', $kasir))->assertRedirect();
    expect($kasir->fresh()->is_active)->toBeTrue()
        ->and(ActivityLog::where('action', 'user.deactivated')->exists())->toBeTrue()
        ->and(ActivityLog::where('action', 'user.activated')->exists())->toBeTrue();
});

test('admin tidak bisa menonaktifkan dirinya sendiri', function () {
    pengguna('admin'); // masih ada admin lain

    $this->actingAs($this->admin)
        ->post(route('users.deactivate', $this->admin))
        ->assertSessionHas('inertia.flash_data.toast.message', 'Anda tidak bisa menonaktifkan akun sendiri.');

    expect($this->admin->fresh()->is_active)->toBeTrue();
});

test('admin aktif terakhir tidak bisa dinonaktifkan, admin lain boleh bila masih ada admin aktif', function () {
    $kedua = pengguna('admin');

    // Masih ada dua admin aktif: yang kedua boleh dinonaktifkan.
    $this->actingAs($this->admin)->post(route('users.deactivate', $kedua));
    expect($kedua->fresh()->is_active)->toBeFalse();

    // Kini admin pertama satu-satunya admin aktif: lewat Action pun ditolak.
    expect(fn () => app(SetUserActive::class)->handle($this->admin, false, $kedua))
        ->toThrow(UserException::class, 'Harus tetap ada minimal satu admin aktif.');

    expect($this->admin->fresh()->is_active)->toBeTrue();
});

test('kasir dengan shift kas terbuka boleh dinonaktifkan; shift-nya tetap terbuka', function () {
    [$kasir, $shift] = kasirDenganShift();

    $this->actingAs($this->admin)->post(route('users.deactivate', $kasir));

    expect($kasir->fresh()->is_active)->toBeFalse()
        ->and(CashShift::find($shift->id)->closed_at)->toBeNull();
});

test('pengguna nonaktif tidak bisa masuk, dan sesinya yang berjalan dikeluarkan', function () {
    $kasir = pengguna('kasir', ['password' => 'rahasia123']);
    $this->actingAs($this->admin)->post(route('users.deactivate', $kasir));
    auth()->logout();

    $this->post(route('login.store'), ['email' => $kasir->email, 'password' => 'rahasia123']);
    $this->assertGuest();

    $this->actingAs($kasir->fresh())->get(route('dashboard'))->assertRedirect(route('login'));
});
