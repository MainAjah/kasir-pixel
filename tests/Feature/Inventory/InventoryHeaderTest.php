<?php

use App\Actions\Inventory\AdjustStock;
use App\Actions\Pos\CompleteSale;
use App\Actions\Pos\VoidSale;
use App\Actions\Reports\InventoryReport;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Tahap 5E-2: kepala halaman Inventaris (kartu angka dan tab) dan tab Stok
 * Keluar. Semuanya hanya membaca ledger; aturan stok tidak berubah.
 */

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->admin = User::factory()->create()->assignRole('admin');
});

function produkDenganMinimum(int $stok, int $minimum, string $nama): Product
{
    $product = produkSiapJual($stok, 1000, $nama);
    $product->update(['min_stock' => $minimum]);

    return $product;
}

test('kartu angka Inventaris: produk aktif, stok tersedia, menipis, dan habis', function () {
    produkDenganMinimum(20, 10, 'Aman');
    produkDenganMinimum(5, 10, 'Menipis');
    produkDenganMinimum(10, 10, 'Tepat minimum');
    produkDenganMinimum(0, 10, 'Habis');
    produkDenganMinimum(50, 10, 'Nonaktif')->update(['is_active' => false]);

    $this->actingAs($this->admin)->get('/produk')->assertInertia(fn (Assert $p) => $p
        ->where('stats.products', 4)
        ->where('stats.units', 35)
        ->where('stats.low', 2)
        ->where('stats.empty', 1));

    // Menipis + habis = angka "Stok menipis" di Beranda.
    expect(2 + 1)->toBe(app(InventoryReport::class)->lowStockCount());
});

test('daftar produk membawa gambar barang, kasir juga melihat kartu angkanya', function () {
    $teh = produkSiapJual(10, 5000, 'Teh Botol');
    $teh->forceFill(['image_path' => 'produk/teh.png'])->save();
    $kasir = User::factory()->create()->assignRole('kasir');

    $this->actingAs($kasir)->get('/produk')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('products.data.0.image_url', '/storage/produk/teh.png')
        ->where('stats.products', 1));
});

test('Stok Masuk (penerimaan barang) memakai kartu angka yang sama', function () {
    produkDenganMinimum(3, 10, 'Menipis');

    $this->actingAs($this->admin)->get('/penerimaan-barang')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('inventaris/penerimaan/index')
        ->where('stats.low', 1));
});

test('Stok Keluar hanya mutasi yang mengurangi stok: penjualan dan koreksi minus', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(20, 3000, 'Mie Instan');

    $sale = app(CompleteSale::class)->handle($kasir, [['product_unit_id' => $mie->baseUnit->id, 'qty' => 3]], 9000);
    app(AdjustStock::class)->handle($mie, StockMovementType::Adjustment, $mie->baseUnit, -2, $this->admin->id, note: 'rusak');
    app(AdjustStock::class)->handle($mie, StockMovementType::Adjustment, $mie->baseUnit, 5, $this->admin->id, note: 'temuan');

    $this->actingAs($this->admin)->get('/stok-keluar')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('inventaris/stok-keluar')
        ->has('movements.data', 2)
        ->where('movements.data.0.type', 'adjustment')
        ->where('movements.data.0.qty', -2)
        ->where('movements.data.0.note', 'rusak')
        ->where('movements.data.1.type', 'sale')
        ->where('movements.data.1.qty', -3)
        ->where('movements.data.1.document', $sale->number)
        ->where('movements.data.1.is_reversed', false)
        ->has('stats'));

    // Penjualan yang dibatalkan tetap tercatat keluar, ditandai sudah dibalik;
    // mutasi pembalik (+3) tidak masuk daftar keluar.
    app(VoidSale::class)->handle($sale, $this->admin, 'salah barang');

    $this->get('/stok-keluar')->assertInertia(fn (Assert $p) => $p
        ->has('movements.data', 2)
        ->where('movements.data.1.is_reversed', true));
});

test('Stok Keluar khusus admin', function (string $role) {
    $user = User::factory()->create()->assignRole($role);

    $this->actingAs($user)->get('/stok-keluar')->assertForbidden();
})->with(['kasir', 'bendahara']);
