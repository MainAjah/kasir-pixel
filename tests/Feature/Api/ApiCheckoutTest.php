<?php

use App\Actions\Pos\CompleteSale;
use App\Events\SaleCompleted;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    [$this->kasir, $this->shift] = kasirDenganShift();
    Sanctum::actingAs($this->kasir);
});

/** @param  list<array{0: Product|ProductUnit, 1: int}>  $rows */
function keranjang(array $rows): array
{
    return array_map(fn ($r) => [
        'product_unit_id' => $r[0] instanceof Product ? $r[0]->baseUnit->id : $r[0]->id,
        'qty' => $r[1],
    ], $rows);
}

test('hitung total: harga dari server, harga kiriman diabaikan, tidak menulis apa pun', function () {
    $mie = produkSiapJual(10, 3000);
    $teh = produkSiapJual(1, 5000, 'Teh Botol');

    $items = keranjang([[$mie, 2], [$teh, 3]]);
    $items[0]['price'] = 1; // dicoba dimanipulasi, harus diabaikan

    $this->postJson('/api/v1/keranjang/hitung', ['items' => $items])
        ->assertOk()
        ->assertJsonPath('data.total', 21000)
        ->assertJsonPath('data.items.0.unit_price', 3000)
        ->assertJsonPath('data.items.0.line_total', 6000)
        ->assertJsonPath('data.items.0.stock_enough', true)
        ->assertJsonPath('data.items.1.stock_available', 1)
        ->assertJsonPath('data.items.1.stock_enough', false)
        ->assertJsonPath('data.all_stock_enough', false);

    expect(Sale::count())->toBe(0)
        ->and(StockMovement::where('type', 'sale')->count())->toBe(0);
});

test('hitung total menjumlah kebutuhan satu produk dari dua satuan', function () {
    $mie = produkSiapJual(30, 3000);
    $dus = ProductUnit::factory()->for($mie)->create(['name' => 'dus', 'conversion' => 24, 'sell_price' => 60000]);

    // 1 dus (24) + 10 pcs = 34 > 30: kedua baris tidak cukup.
    $this->postJson('/api/v1/keranjang/hitung', ['items' => keranjang([[$dus, 1], [$mie, 10]])])
        ->assertOk()
        ->assertJsonPath('data.total', 90000)
        ->assertJsonPath('data.items.0.stock_enough', false)
        ->assertJsonPath('data.items.1.stock_enough', false);
});

test('hitung total menolak keranjang kosong dan barang nonaktif', function () {
    $mie = produkSiapJual(10);
    $mie->update(['is_active' => false]);

    $this->postJson('/api/v1/keranjang/hitung', ['items' => []])->assertUnprocessable();
    $this->postJson('/api/v1/keranjang/hitung', ['items' => keranjang([[$mie, 1]])])
        ->assertUnprocessable()
        ->assertJsonPath('message', "Produk {$mie->name} sedang nonaktif.");
});

test('checkout sukses: 201, stok berkurang, nota lengkap, dan SaleCompleted terpancar', function () {
    Event::fake([SaleCompleted::class]);
    $mie = produkSiapJual(10, 3000);
    $teh = produkSiapJual(5, 5000, 'Teh Botol');

    $response = $this->postJson('/api/v1/penjualan', [
        'items' => keranjang([[$mie, 2], [$teh, 1]]),
        'tendered' => 20000,
    ])->assertCreated();

    $sale = Sale::sole();

    $response
        ->assertJsonPath('data.number', $sale->number)
        ->assertJsonPath('data.total', 11000)
        ->assertJsonPath('data.tendered', 20000)
        ->assertJsonPath('data.change', 9000)
        ->assertJsonPath('data.items.0.name', 'Mie Instan')
        ->assertJsonPath('data.items.1.qty', 1)
        ->assertJsonPath('data.receipt_url', route('pos.sales.receipt', $sale));

    expect($mie->currentStock())->toBe(8)
        ->and($teh->currentStock())->toBe(4)
        ->and(SaleItem::count())->toBe(2)
        ->and(Payment::count())->toBe(1);

    Event::assertDispatched(SaleCompleted::class);
});

test('skenario soal: 5 barang, barang ke-4 habis dibeli jalur lain, seluruh keranjang di-rollback', function () {
    Event::fake([SaleCompleted::class]);

    $barang = [
        produkSiapJual(20, 3000, 'Barang 1'),
        produkSiapJual(20, 4000, 'Barang 2'),
        produkSiapJual(20, 5000, 'Barang 3'),
        produkSiapJual(2, 6000, 'Barang 4'),
        produkSiapJual(20, 7000, 'Barang 5'),
    ];
    $items = keranjang(array_map(fn (Product $p) => [$p, 2], $barang));

    // 1. Kasir menghitung keranjang: semua cukup.
    $this->postJson('/api/v1/keranjang/hitung', ['items' => $items])
        ->assertOk()
        ->assertJsonPath('data.total', 50000)
        ->assertJsonPath('data.all_stock_enough', true);

    // 2. Sebelum kasir membayar, stok barang ke-4 habis dibeli lewat jalur lain (kasir kedua).
    [$kasirLain] = kasirDenganShift();
    $penjualanLain = app(CompleteSale::class)->handle($kasirLain, keranjang([[$barang[3], 2]]), 12000);
    expect($barang[3]->currentStock())->toBe(0);

    $stokSebelum = array_map(fn (Product $p) => $p->currentStock(), $barang);
    $jumlahMutasi = StockMovement::count();

    // 3. Kasir membayar: barang 1-3 sudah diproses di dalam transaksi, barang ke-4 gagal.
    $this->postJson('/api/v1/penjualan', ['items' => $items, 'tendered' => 50000])
        ->assertStatus(409)
        ->assertJsonPath('rolled_back', true)
        ->assertJsonPath('failed_item.product_id', $barang[3]->id)
        ->assertJsonPath('failed_item.product_name', 'Barang 4')
        ->assertJsonPath('failed_item.available', 0)
        ->assertJsonPath('failed_item.requested', 2);

    // 4. Tidak ada sisa: hanya penjualan lain yang tercatat, stok kelima barang tidak berubah.
    expect(Sale::pluck('id')->all())->toBe([$penjualanLain->id])
        ->and(SaleItem::where('sale_id', '!=', $penjualanLain->id)->count())->toBe(0)
        ->and(Payment::where('sale_id', '!=', $penjualanLain->id)->count())->toBe(0)
        ->and(StockMovement::count())->toBe($jumlahMutasi)
        ->and(array_map(fn (Product $p) => $p->currentStock(), $barang))->toBe($stokSebelum)
        ->and($stokSebelum)->toBe([20, 20, 20, 0, 20]);

    // Hanya penjualan lain yang memancarkan SaleCompleted.
    Event::assertDispatchedTimes(SaleCompleted::class, 1);
});

test('kunci berurutan: keranjang dengan urutan id terbalik dan dua satuan tetap benar', function () {
    $a = produkSiapJual(50, 1000, 'Barang A');
    $b = produkSiapJual(50, 2000, 'Barang B');
    $dusB = ProductUnit::factory()->for($b)->create(['name' => 'dus', 'conversion' => 10, 'sell_price' => 18000]);

    $this->postJson('/api/v1/penjualan', [
        'items' => keranjang([[$dusB, 1], [$b, 3], [$a, 4]]),
        'tendered' => 100000,
    ])
        ->assertCreated()
        ->assertJsonPath('data.total', 28000)
        // Urutan baris di nota mengikuti keranjang, bukan urutan kunci.
        ->assertJsonPath('data.items.0.unit', 'dus')
        ->assertJsonPath('data.items.2.name', 'Barang A');

    expect($a->currentStock())->toBe(46)->and($b->currentStock())->toBe(37);
});

test('aturan kasir dijawab 422 dan tidak menulis apa pun', function () {
    $mie = produkSiapJual(10, 3000);

    $this->postJson('/api/v1/penjualan', ['items' => keranjang([[$mie, 2]]), 'tendered' => 5999])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Uang diterima kurang dari total belanja.')
        ->assertJsonPath('rolled_back', true);

    $this->postJson('/api/v1/penjualan', ['items' => [], 'tendered' => 1000])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['items']);

    // Kasir tanpa shift.
    $tanpaShift = User::factory()->create()->assignRole('kasir');
    Sanctum::actingAs($tanpaShift);
    $this->postJson('/api/v1/penjualan', ['items' => keranjang([[$mie, 1]]), 'tendered' => 3000])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Buka shift dulu sebelum menjual.');

    expect(Sale::count())->toBe(0)->and($mie->currentStock())->toBe(10);
});
