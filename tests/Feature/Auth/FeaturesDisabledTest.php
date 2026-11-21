<?php

use App\Models\User;

// Fitur bawaan starter kit yang sengaja dimatikan: akun hanya dibuat admin,
// tidak ada pendaftaran publik, hapus akun sendiri, atau verifikasi email.

test('pendaftaran publik tidak tersedia', function () {
    $this->get('/register')->assertNotFound();

    $this->post('/register', [
        'name' => 'Penyusup',
        'email' => 'penyusup@example.com',
        'password' => 'password-rahasia-1',
        'password_confirmation' => 'password-rahasia-1',
    ])->assertNotFound();

    expect(User::where('email', 'penyusup@example.com')->exists())->toBeFalse();
});

test('pengguna tidak bisa menghapus akunnya sendiri', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->delete('/settings/profile', ['password' => 'password'])
        ->assertStatus(405);

    expect($user->fresh())->not->toBeNull();
});

test('rute verifikasi email tidak ada', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)->get('/email/verify')->assertNotFound();
});

test('akun tanpa verifikasi email tetap bisa membuka dasbor', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)->get(route('dashboard'))->assertOk();
});
