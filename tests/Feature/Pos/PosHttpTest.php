<?php

use App\Actions\Pos\CloseShift;
use App\Actions\Pos\CompleteSale;
use App\Events\ItemScanned;
use App\Events\SaleOpened;
use App\Models\ActivityLog;
use App\Models\CashShift;
use App\Models\ProductUnit;
use App\Models\Sale;
use App\Models\SaleVoid;
use App\Models\StockMovement;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->admin = User::factory()->create()->assignRole('admin');
    $this->bendahara = User::factory()->create()->assignRole('bendahara');
});

function jualLewatAction(User $kasir, ProductUnit $unit, int $qty, int $bayar): Sale
{
    return app(CompleteSale::class)->handle($kasir, [['product_unit_id' => $unit->id, 'qty' => $qty]], $bayar);
}

// --- Akses -----------------------------------------------------------------

test('tamu diarahkan ke login dari semua halaman kasir', function (string $url) {
    $this->get($url)->assertRedirect(route('login'));
})->with(['/kasir', '/kasir/penjualan', '/kasir/shift/tutup', '/kasir/cari?q=a', '/kasir/barcode/123']);

test('bendahara tidak boleh membuka halaman kasir', function (string $url) {
    $this->actingAs($this->bendahara)->get($url)->assertForbidden();
})->with(['/kasir', '/kasir/penjualan', '/kasir/shift/tutup', '/kasir/cari?q=a', '/kasir/barcode/123']);

test('kasir dan admin boleh membuka layar kasir', function (string $role) {
    $user = User::factory()->create()->assignRole($role);

    $this->actingAs($user)->get('/kasir')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('kasir/index')->where('shift', null));
})->with(['kasir', 'admin']);

test('layar kasir menampilkan shift yang aktif', function () {
    [$kasir, $shift] = kasirDenganShift(75000);

    $this->actingAs($kasir)->get('/kasir')->assertInertia(fn (Assert $page) => $page
        ->where('shift.id', $shift->id)
        ->where('shift.opening_cash', 75000)
        ->where('cashier.id', $kasir->id));
});

test('kasir bisa membaca daftar produk tetapi tidak bisa mengelolanya', function () {
    $kasir = User::factory()->create()->assignRole('kasir');
    $produk = produkSiapJual(5, 1000);

    $this->actingAs($kasir)->get('/produk')->assertOk();

    foreach (['/produk/baru', "/produk/{$produk->id}/ubah", "/produk/{$produk->id}/kartu-stok", '/penerimaan-barang', '/koreksi-stok', '/kategori'] as $url) {
        $this->get($url)->assertForbidden();
    }
    $this->post('/produk', [])->assertForbidden();
    $this->put("/produk/{$produk->id}", [])->assertForbidden();
    $this->post('/koreksi-stok', [])->assertForbidden();
});

test('bendahara tidak boleh membaca daftar produk', function () {
    $this->actingAs($this->bendahara)->get('/produk')->assertForbidden();
});

// --- Pencarian -------------------------------------------------------------

test('barcode dus mengembalikan satuan dus dengan harga dan stok', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(100, 3000);
    $dus = ProductUnit::factory()->for($mie)->create(['name' => 'dus', 'conversion' => 24, 'sell_price' => 60000, 'barcode' => '899DUS']);

    $this->actingAs($kasir)->getJson('/kasir/barcode/899DUS')
        ->assertOk()
        ->assertJson([
            'product_unit_id' => $dus->id,
            'unit_name' => 'dus',
            'conversion' => 24,
            'price' => 60000,
            'stock_base' => 100,
            'stock_units' => 4,
        ]);
});

test('barcode tak dikenal dan produk nonaktif mengembalikan 404', function () {
    [$kasir] = kasirDenganShift();
    $mati = produkSiapJual(5, 1000, 'Produk Mati');
    $mati->baseUnit->update(['barcode' => '111']);
    $mati->update(['is_active' => false]);

    $this->actingAs($kasir)->getJson('/kasir/barcode/000')->assertNotFound();
    $this->getJson('/kasir/barcode/111')->assertNotFound();
});

test('pencarian manual lewat nama dan SKU, hanya produk aktif', function () {
    [$kasir] = kasirDenganShift();
    $teh = produkSiapJual(10, 5000, 'Teh Botol Sosro');
    $teh->update(['sku' => 'TEH-777']);
    $mati = produkSiapJual(10, 5000, 'Teh Hijau Nonaktif');
    $mati->update(['is_active' => false]);

    $this->actingAs($kasir)->getJson('/kasir/cari?q=Teh')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Teh Botol Sosro')
        ->assertJsonPath('0.units.0.unit_name', 'pcs');

    $this->getJson('/kasir/cari?q=TEH-777')->assertJsonCount(1);
    $this->getJson('/kasir/cari?q=')->assertOk()->assertExactJson([]);
    $this->getJson('/kasir/cari?q=tidakada')->assertOk()->assertExactJson([]);
});

test('pencarian memperlakukan persen dan garis bawah sebagai huruf biasa', function () {
    [$kasir] = kasirDenganShift();
    produkSiapJual(1, 1000, 'Sabun');

    $this->actingAs($kasir)->getJson('/kasir/cari?q=%25')->assertExactJson([]);
});

// --- Shift lewat HTTP ------------------------------------------------------

test('kasir membuka dan menutup shift lewat formulir', function () {
    $kasir = User::factory()->create()->assignRole('kasir');

    $this->actingAs($kasir)->post('/kasir/shift', ['opening_cash' => 50000])
        ->assertSessionHasNoErrors()->assertRedirect(route('pos.index'));

    $shift = CashShift::activeFor($kasir);
    expect($shift->opening_cash)->toBe(50000);

    $this->get('/kasir/shift/tutup')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('kasir/tutup-shift')->where('shift.opening_cash', 50000));

    $this->post('/kasir/shift/tutup', ['counted_cash' => 50000])
        ->assertSessionHasNoErrors()->assertRedirect(route('pos.shift.show', $shift));

    expect($shift->fresh()->difference)->toBe(0);

    $this->get("/kasir/shift/{$shift->id}")->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('shift.expected_cash', 50000)->where('shift.difference', 0));
});

test('buka shift kedua ditolak dengan pesan, kas awal negatif ditolak', function () {
    [$kasir] = kasirDenganShift();

    $this->actingAs($kasir)->post('/kasir/shift', ['opening_cash' => 1])->assertSessionHasErrors('opening_cash');
    $this->post('/kasir/shift', ['opening_cash' => -5])->assertSessionHasErrors('opening_cash');

    expect(CashShift::count())->toBe(1);
});

test('tutup shift dengan selisih tanpa catatan ditolak dan shift tetap terbuka', function () {
    [$kasir, $shift] = kasirDenganShift(100000);

    $this->actingAs($kasir)->post('/kasir/shift/tutup', ['counted_cash' => 90000])
        ->assertSessionHasErrors('counted_cash');

    expect($shift->fresh()->isOpen())->toBeTrue();

    $this->post('/kasir/shift/tutup', ['counted_cash' => 90000, 'closing_note' => 'selisih'])
        ->assertSessionHasNoErrors();

    expect($shift->fresh()->difference)->toBe(-10000);
});

test('hasil shift hanya untuk pemilik dan admin', function () {
    [$kasir, $shift] = kasirDenganShift();
    $lain = User::factory()->create()->assignRole('kasir');

    $this->actingAs($lain)->get("/kasir/shift/{$shift->id}")->assertForbidden();
    $this->actingAs($kasir)->get("/kasir/shift/{$shift->id}")->assertOk();
    $this->actingAs($this->admin)->get("/kasir/shift/{$shift->id}")->assertOk();
});

// --- Penjualan lewat HTTP --------------------------------------------------

test('bayar tunai membuat penjualan lalu membuka struk', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(20, 3000);

    $response = $this->actingAs($kasir)->post('/kasir/penjualan', [
        'items' => [['product_unit_id' => $mie->baseUnit->id, 'qty' => 3]],
        'tendered' => 10000,
    ]);

    $sale = Sale::firstOrFail();
    $response->assertSessionHasNoErrors()->assertRedirect(route('pos.sales.receipt', $sale));

    expect($sale->total)->toBe(9000)->and($mie->currentStock())->toBe(17);

    $this->get("/kasir/penjualan/{$sale->id}/struk")->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('kasir/struk')
        ->where('sale.total', 9000)
        ->where('sale.tendered', 10000)
        ->where('sale.change', 1000)
        ->where('sale.method', 'Tunai')
        ->where('sale.items.0.name', 'Mie Instan')
        ->where('sale.items.0.qty', 3));
});

test('stok kurang saat bayar: pesan kesalahan tampil dan tidak ada data tersimpan', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(2, 3000);

    $this->actingAs($kasir)->post('/kasir/penjualan', [
        'items' => [['product_unit_id' => $mie->baseUnit->id, 'qty' => 5]],
        'tendered' => 100000,
    ])->assertSessionHasErrors('cart');

    expect(Sale::count())->toBe(0)->and($mie->currentStock())->toBe(2);
});

test('uang kurang saat bayar ditolak', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(10, 3000);

    $this->actingAs($kasir)->post('/kasir/penjualan', [
        'items' => [['product_unit_id' => $mie->baseUnit->id, 'qty' => 2]],
        'tendered' => 1000,
    ])->assertSessionHasErrors('cart');

    expect(Sale::count())->toBe(0);
});

test('harga yang dikirim browser tidak dipakai', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(10, 3000);

    $this->actingAs($kasir)->post('/kasir/penjualan', [
        'items' => [['product_unit_id' => $mie->baseUnit->id, 'qty' => 1, 'unit_price' => 1]],
        'tendered' => 3000,
    ])->assertSessionHasNoErrors();

    expect(Sale::firstOrFail()->total)->toBe(3000);
});

test('permintaan bayar yang tidak valid ditolak validasi', function () {
    [$kasir] = kasirDenganShift();

    $this->actingAs($kasir)->post('/kasir/penjualan', ['items' => [], 'tendered' => 1000])->assertSessionHasErrors('items');
    $this->post('/kasir/penjualan', ['items' => [['product_unit_id' => 1, 'qty' => 0]], 'tendered' => 1000])
        ->assertSessionHasErrors('items.0.qty');
    $this->post('/kasir/penjualan', ['items' => [['product_unit_id' => 1, 'qty' => 1]]])->assertSessionHasErrors('tendered');
});

test('bayar tanpa shift aktif ditolak', function () {
    $kasir = User::factory()->create()->assignRole('kasir');
    $mie = produkSiapJual(10, 1000);

    $this->actingAs($kasir)->post('/kasir/penjualan', [
        'items' => [['product_unit_id' => $mie->baseUnit->id, 'qty' => 1]],
        'tendered' => 1000,
    ])->assertSessionHasErrors('cart');

    expect(Sale::count())->toBe(0);
});

test('kasir tidak bisa melihat struk kasir lain, admin bisa', function () {
    [$a] = kasirDenganShift();
    [$b] = kasirDenganShift();
    $mie = produkSiapJual(10, 1000);
    $sale = jualLewatAction($a, $mie->baseUnit, 1, 1000);

    $this->actingAs($b)->get("/kasir/penjualan/{$sale->id}/struk")->assertForbidden();
    $this->actingAs($a)->get("/kasir/penjualan/{$sale->id}/struk")->assertOk();
    $this->actingAs($this->admin)->get("/kasir/penjualan/{$sale->id}/struk")->assertOk();
});

// --- Riwayat dan pembatalan ------------------------------------------------

test('riwayat kasir hanya memuat penjualannya sendiri', function () {
    [$a] = kasirDenganShift();
    [$b] = kasirDenganShift();
    $mie = produkSiapJual(10, 1000);
    jualLewatAction($a, $mie->baseUnit, 1, 1000);
    jualLewatAction($b, $mie->baseUnit, 2, 2000);

    $this->actingAs($a)->get('/kasir/penjualan')->assertInertia(fn (Assert $p) => $p
        ->where('scope', 'kasir')
        ->has('sales.data', 1)
        ->where('sales.data.0.total', 1000)
        ->where('sales.data.0.can_void', false));
});

test('admin melihat penjualan di shift terbuka dan bisa membatalkannya', function () {
    [$kasir, $shift] = kasirDenganShift(100000);
    $mie = produkSiapJual(10, 1000);
    $sale = jualLewatAction($kasir, $mie->baseUnit, 3, 3000);

    $this->actingAs($this->admin)->get('/kasir/penjualan')->assertInertia(fn (Assert $p) => $p
        ->where('scope', 'admin')
        ->has('sales.data', 1)
        ->where('sales.data.0.can_void', true));

    $this->post("/kasir/penjualan/{$sale->id}/batal", ['reason' => 'salah barang'])
        ->assertSessionHasNoErrors()->assertRedirect(route('pos.sales.index'));

    expect(SaleVoid::count())->toBe(1)
        ->and($mie->currentStock())->toBe(10)
        ->and(ActivityLog::where('action', 'sale.voided')->count())->toBe(1);

    $this->get('/kasir/penjualan')->assertInertia(fn (Assert $p) => $p
        ->where('sales.data.0.is_voided', true)
        ->where('sales.data.0.can_void', false)
        ->where('sales.data.0.void_reason', 'salah barang'));
});

test('kasir tidak bisa membatalkan penjualan lewat HTTP', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(10, 1000);
    $sale = jualLewatAction($kasir, $mie->baseUnit, 1, 1000);

    $this->actingAs($kasir)->post("/kasir/penjualan/{$sale->id}/batal", ['reason' => 'coba'])->assertForbidden();

    expect(SaleVoid::count())->toBe(0)->and($mie->currentStock())->toBe(9);
});

test('pembatalan di shift yang sudah ditutup ditolak dan tidak muncul di daftar admin', function () {
    [$kasir, $shift] = kasirDenganShift(100000);
    $mie = produkSiapJual(10, 1000);
    $sale = jualLewatAction($kasir, $mie->baseUnit, 1, 1000);
    app(CloseShift::class)->handle($shift, $kasir, 101000);

    $this->actingAs($this->admin)->post("/kasir/penjualan/{$sale->id}/batal", ['reason' => 'terlambat'])
        ->assertSessionHasErrors('reason');

    expect(SaleVoid::count())->toBe(0)
        ->and(StockMovement::where('type', 'sale_void')->count())->toBe(0);

    $this->get('/kasir/penjualan')->assertInertia(fn (Assert $p) => $p->has('sales.data', 0));
});

test('pembatalan tanpa alasan ditolak validasi', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(10, 1000);
    $sale = jualLewatAction($kasir, $mie->baseUnit, 1, 1000);

    $this->actingAs($this->admin)->post("/kasir/penjualan/{$sale->id}/batal", ['reason' => ''])
        ->assertSessionHasErrors('reason');
});

// --- Peristiwa untuk diorama -----------------------------------------------

test('relai peristiwa memancarkan SaleOpened dan ItemScanned', function () {
    Event::fake([SaleOpened::class, ItemScanned::class]);
    [$kasir] = kasirDenganShift();

    $this->actingAs($kasir)->postJson('/kasir/peristiwa', ['type' => 'sale.opened'])->assertNoContent();
    $this->postJson('/kasir/peristiwa', ['type' => 'item.scanned', 'product' => 'Mie Instan', 'unit' => 'dus', 'qty' => 2])
        ->assertNoContent();

    Event::assertDispatched(SaleOpened::class, fn (SaleOpened $e) => $e->cashierId === $kasir->id);
    Event::assertDispatched(ItemScanned::class, fn (ItemScanned $e) => $e->productName === 'Mie Instan'
        && $e->unitName === 'dus' && $e->qty === 2 && $e->cashierId === $kasir->id);
});

test('relai peristiwa menolak jenis lain dan tidak menyentuh database', function () {
    Event::fake();
    [$kasir] = kasirDenganShift();

    $this->actingAs($kasir)->postJson('/kasir/peristiwa', ['type' => 'sale.completed'])->assertUnprocessable();
    $this->postJson('/kasir/peristiwa', ['type' => 'item.scanned'])->assertUnprocessable();

    expect(Sale::count())->toBe(0);
    Event::assertNotDispatched(SaleOpened::class);
});

test('relai peristiwa hanya untuk kasir dan admin', function () {
    $this->postJson('/kasir/peristiwa', ['type' => 'sale.opened'])->assertUnauthorized();
    $this->actingAs($this->bendahara)->postJson('/kasir/peristiwa', ['type' => 'sale.opened'])->assertForbidden();
});

test('satuan yang sudah terjual tidak bisa lagi diubah isinya', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(10, 1000);
    $dus = ProductUnit::factory()->for($mie)->create(['name' => 'dus', 'conversion' => 6, 'sell_price' => 5000]);
    expect($dus->isInUse())->toBeFalse();

    jualLewatAction($kasir, $dus, 1, 5000);

    expect($dus->fresh()->isInUse())->toBeTrue();
});
