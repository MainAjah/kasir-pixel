<?php

use App\Actions\Pos\CompleteSale;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

dataset('endpoint api', [
    'produk' => ['GET', '/api/v1/produk'],
    'satu produk' => ['GET', '/api/v1/produk/1'],
    'hitung' => ['POST', '/api/v1/keranjang/hitung'],
    'checkout' => ['POST', '/api/v1/penjualan'],
    'nota' => ['GET', '/api/v1/penjualan/1'],
    'mutasi' => ['GET', '/api/v1/produk/1/mutasi'],
    'cabut token' => ['DELETE', '/api/v1/token'],
]);

test('tanpa token atau login semua endpoint menjawab 401 JSON', function (string $method, string $uri) {
    $this->json($method, $uri)
        ->assertUnauthorized()
        ->assertJsonPath('message', 'Unauthenticated.');
})->with('endpoint api');

test('bendahara ditolak 403 di endpoint kasir dan stok', function (string $method, string $uri) {
    $product = produkSiapJual(5);
    Sanctum::actingAs(User::factory()->create()->assignRole('bendahara'));

    $this->json($method, str_replace('{id}', (string) $product->id, $uri))->assertForbidden();
})->with([
    'produk' => ['GET', '/api/v1/produk'],
    'satu produk' => ['GET', '/api/v1/produk/{id}'],
    'hitung' => ['POST', '/api/v1/keranjang/hitung'],
    'checkout' => ['POST', '/api/v1/penjualan'],
    'mutasi' => ['GET', '/api/v1/produk/{id}/mutasi'],
]);

test('kasir ditolak 403 di mutasi stok, admin boleh', function () {
    $product = produkSiapJual(10);

    Sanctum::actingAs(User::factory()->create()->assignRole('kasir'));
    $this->getJson("/api/v1/produk/{$product->id}/mutasi")->assertForbidden();

    Sanctum::actingAs(User::factory()->create()->assignRole('admin'));
    $this->getJson("/api/v1/produk/{$product->id}/mutasi")->assertOk();
});

test('kasir hanya bisa membuka notanya sendiri, admin semua', function () {
    [$kasirA] = kasirDenganShift();
    [$kasirB] = kasirDenganShift();
    $mie = produkSiapJual(10, 3000);
    $sale = app(CompleteSale::class)->handle($kasirA, [['product_unit_id' => $mie->baseUnit->id, 'qty' => 1]], 3000);

    Sanctum::actingAs($kasirA);
    $this->getJson("/api/v1/penjualan/{$sale->id}")->assertOk()->assertJsonPath('data.number', $sale->number);

    Sanctum::actingAs($kasirB);
    $this->getJson("/api/v1/penjualan/{$sale->id}")->assertForbidden();

    Sanctum::actingAs(User::factory()->create()->assignRole('admin'));
    $this->getJson("/api/v1/penjualan/{$sale->id}")->assertOk();
});

test('layar kasir yang sudah login memanggil API lewat sesi, tanpa token', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(10, 3000);

    $this->actingAs($kasir)
        ->withHeader('Referer', config('app.url'))
        ->postJson('/api/v1/penjualan', [
            'items' => [['product_unit_id' => $mie->baseUnit->id, 'qty' => 2]],
            'tendered' => 6000,
        ])
        ->assertCreated()
        ->assertJsonPath('data.total', 6000);
});
