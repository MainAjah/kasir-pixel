<?php

use App\Actions\Pos\CompleteSale;
use App\Models\ProductUnit;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    Sanctum::actingAs(User::factory()->create()->assignRole('kasir'));
});

test('daftar produk: hanya produk aktif, stok dari ledger, satuan dasar lebih dulu', function () {
    $mie = produkSiapJual(30, 3000, 'Mie Instan');
    ProductUnit::factory()->for($mie)->create(['name' => 'dus', 'conversion' => 24, 'sell_price' => 60000, 'barcode' => 'DUS-MIE']);
    $nonaktif = produkSiapJual(5, 1000, 'Barang Lama');
    $nonaktif->update(['is_active' => false]);

    $response = $this->getJson('/api/v1/produk')->assertOk();

    expect($response->json('data'))->toHaveCount(1);

    $response
        ->assertJsonPath('data.0.id', $mie->id)
        ->assertJsonPath('data.0.stock', 30)
        ->assertJsonPath('data.0.units.0.unit_name', $mie->baseUnit->name)
        ->assertJsonPath('data.0.units.0.price', 3000)
        ->assertJsonPath('data.0.units.1.unit_name', 'dus')
        ->assertJsonPath('data.0.units.1.conversion', 24)
        ->assertJsonPath('data.0.units.1.stock_units', 1)
        ->assertJsonPath('data.0.units.1.barcode', 'DUS-MIE');
});

test('satu produk: stok ikut turun setelah penjualan, produk nonaktif 404', function () {
    $mie = produkSiapJual(10, 3000);
    [$kasir] = kasirDenganShift();
    app(CompleteSale::class)->handle($kasir, [['product_unit_id' => $mie->baseUnit->id, 'qty' => 3]], 9000);

    $this->getJson("/api/v1/produk/{$mie->id}")->assertOk()->assertJsonPath('data.stock', 7);

    $mie->update(['is_active' => false]);
    $this->getJson("/api/v1/produk/{$mie->id}")->assertNotFound();
});

test('mutasi stok sama dengan ledger: terbaru di atas, balance_after, dan nomor nota', function () {
    Sanctum::actingAs(User::factory()->create()->assignRole('admin'));
    $mie = produkSiapJual(10, 3000);
    [$kasir] = kasirDenganShift();
    $sale = app(CompleteSale::class)->handle($kasir, [['product_unit_id' => $mie->baseUnit->id, 'qty' => 4]], 12000);

    $this->getJson("/api/v1/produk/{$mie->id}/mutasi")
        ->assertOk()
        ->assertJsonPath('product.stock', 6)
        ->assertJsonPath('movements.total', 2)
        ->assertJsonPath('movements.data.0.type', 'sale')
        ->assertJsonPath('movements.data.0.qty', -4)
        ->assertJsonPath('movements.data.0.balance_after', 6)
        ->assertJsonPath('movements.data.0.document', $sale->number)
        ->assertJsonPath('movements.data.1.type', 'opening')
        ->assertJsonPath('movements.data.1.balance_after', 10);
});
