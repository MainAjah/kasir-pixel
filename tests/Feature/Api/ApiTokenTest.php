<?php

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Laravel\Sanctum\PersonalAccessToken;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function apiKasir(array $attributes = []): User
{
    return User::factory()->create($attributes)->assignRole('kasir');
}

test('login benar memberi token Bearer beserta peran', function () {
    $user = apiKasir(['email' => 'kasir@contoh.test']);

    $this->postJson('/api/v1/token', [
        'email' => 'kasir@contoh.test',
        'password' => 'password',
        'device_name' => 'postman',
    ])
        ->assertCreated()
        ->assertJsonPath('token_type', 'Bearer')
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonPath('user.role', 'kasir')
        ->assertJsonPath('user.role_label', 'Kasir');

    expect(PersonalAccessToken::where('tokenable_id', $user->id)->value('name'))->toBe('postman');
});

test('kata sandi salah dan email tak dikenal ditolak 422 tanpa token', function () {
    apiKasir(['email' => 'kasir@contoh.test']);

    $this->postJson('/api/v1/token', ['email' => 'kasir@contoh.test', 'password' => 'salah'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email' => 'Email atau kata sandi salah.']);

    $this->postJson('/api/v1/token', ['email' => 'tidakada@contoh.test', 'password' => 'password'])
        ->assertUnprocessable();

    expect(PersonalAccessToken::count())->toBe(0);
});

test('akun nonaktif tidak mendapat token', function () {
    $user = apiKasir(['email' => 'kasir@contoh.test']);
    $user->forceFill(['is_active' => false])->save();

    $this->postJson('/api/v1/token', ['email' => 'kasir@contoh.test', 'password' => 'password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email' => 'Akun Anda dinonaktifkan.']);
});

test('token dipakai lewat header Bearer, lalu dicabut dan tidak berlaku lagi', function () {
    apiKasir(['email' => 'kasir@contoh.test']);

    $token = $this->postJson('/api/v1/token', ['email' => 'kasir@contoh.test', 'password' => 'password'])
        ->json('token');

    $this->withToken($token)->getJson('/api/v1/produk')->assertOk();
    $this->withToken($token)->deleteJson('/api/v1/token')->assertOk();

    expect(PersonalAccessToken::count())->toBe(0);

    // Guard di-cache per permintaan dalam tes; lupakan supaya token dibaca ulang.
    app('auth')->forgetGuards();

    $this->withToken($token)->getJson('/api/v1/produk')->assertUnauthorized();
});

test('token milik akun yang kemudian dinonaktifkan ditolak 403', function () {
    $user = apiKasir();
    $token = $user->createToken('postman')->plainTextToken;
    $user->forceFill(['is_active' => false])->save();

    $this->withToken($token)
        ->getJson('/api/v1/produk')
        ->assertForbidden()
        ->assertJsonPath('message', 'Akun Anda dinonaktifkan.');
});
