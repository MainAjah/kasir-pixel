<?php

use App\Actions\Pos\CompleteSale;
use App\Enums\StockMovementType;
use App\Events\SaleCompleted;
use App\Exceptions\PosException;
use App\Exceptions\StockException;
use App\Models\ActivityLog;
use App\Models\Payment;
use App\Models\ProductUnit;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    [$this->kasir, $this->shift] = kasirDenganShift();
    $this->sell = app(CompleteSale::class);
});

function itemDari(ProductUnit $unit, int $qty): array
{
    return ['product_unit_id' => $unit->id, 'qty' => $qty];
}

test('penjualan tunai: total, kembalian, dan stok berkurang', function () {
    $mie = produkSiapJual(50, 3000);
    $teh = produkSiapJual(20, 5000, 'Teh Botol');

    $sale = $this->sell->handle($this->kasir, [
        itemDari($mie->baseUnit, 2),
        itemDari($teh->baseUnit, 1),
    ], 20000);

    expect($sale->total)->toBe(11000)
        ->and($sale->items)->toHaveCount(2)
        ->and($sale->payments)->toHaveCount(1)
        ->and($sale->payments[0]->amount)->toBe(11000)
        ->and($sale->payments[0]->tendered)->toBe(20000)
        ->and($sale->payments[0]->change)->toBe(9000)
        ->and($sale->cash_shift_id)->toBe($this->shift->id)
        ->and($mie->currentStock())->toBe(48)
        ->and($teh->currentStock())->toBe(19);
});

test('uang pas menghasilkan kembalian nol', function () {
    $mie = produkSiapJual(10, 3000);

    $sale = $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 1)], 3000);

    expect($sale->payments[0]->change)->toBe(0);
});

test('uang diterima kurang dari total ditolak tanpa mengubah apa pun', function () {
    $mie = produkSiapJual(10, 3000);

    expect(fn () => $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 2)], 5999))
        ->toThrow(PosException::class, 'kurang');

    expect(Sale::count())->toBe(0)->and($mie->currentStock())->toBe(10);
});

test('penjualan dus mengurangi stok sebesar isi dus', function () {
    $mie = produkSiapJual(100, 3000);
    $dus = ProductUnit::factory()->for($mie)->create(['name' => 'dus', 'conversion' => 24, 'sell_price' => 60000]);

    $sale = $this->sell->handle($this->kasir, [itemDari($dus, 2)], 120000);

    $item = $sale->items[0];
    $movement = StockMovement::where('sale_item_id', $item->id)->firstOrFail();

    expect($sale->total)->toBe(120000)
        ->and($item->base_qty)->toBe(48)
        ->and($item->conversion)->toBe(24)
        ->and($movement->qty)->toBe(-48)
        ->and($movement->input_qty)->toBe(-2)
        ->and($movement->type)->toBe(StockMovementType::Sale)
        ->and($mie->currentStock())->toBe(52);
});

test('harga dari browser diabaikan, harga selalu dari server', function () {
    $mie = produkSiapJual(10, 3000);

    $sale = $this->sell->handle($this->kasir, [
        ['product_unit_id' => $mie->baseUnit->id, 'qty' => 1, 'unit_price' => 1, 'line_total' => 1],
    ], 3000);

    expect($sale->total)->toBe(3000)
        ->and($sale->items[0]->unit_price)->toBe(3000);
});

test('stok kurang menolak seluruh penjualan tanpa sisa data', function () {
    $mie = produkSiapJual(3, 3000);

    expect(fn () => $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 4)], 100000))
        ->toThrow(StockException::class, 'tidak cukup');

    expect(Sale::count())->toBe(0)
        ->and(SaleItem::count())->toBe(0)
        ->and(Payment::count())->toBe(0)
        ->and(StockMovement::where('type', 'sale')->count())->toBe(0)
        ->and($mie->currentStock())->toBe(3);
});

test('gagal di baris kedua membatalkan baris pertama', function () {
    $a = produkSiapJual(10, 1000, 'Barang A');
    $b = produkSiapJual(1, 1000, 'Barang B');

    expect(fn () => $this->sell->handle($this->kasir, [itemDari($a->baseUnit, 2), itemDari($b->baseUnit, 5)], 100000))
        ->toThrow(StockException::class);

    expect($a->currentStock())->toBe(10)
        ->and($b->currentStock())->toBe(1)
        ->and(Sale::count())->toBe(0)
        ->and(SaleItem::count())->toBe(0);
});

test('stok yang sama dibagi dua baris satuan berbeda tetap dijaga', function () {
    $mie = produkSiapJual(30, 3000);
    $dus = ProductUnit::factory()->for($mie)->create(['name' => 'dus', 'conversion' => 24, 'sell_price' => 60000]);

    // 1 dus (24) + 10 pcs = 34 > 30.
    expect(fn () => $this->sell->handle($this->kasir, [itemDari($dus, 1), itemDari($mie->baseUnit, 10)], 1000000))
        ->toThrow(StockException::class);

    expect($mie->currentStock())->toBe(30)->and(Sale::count())->toBe(0);
});

test('baris dengan satuan yang sama digabung', function () {
    $mie = produkSiapJual(10, 3000);

    $sale = $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 2), itemDari($mie->baseUnit, 3)], 15000);

    expect($sale->items)->toHaveCount(1)
        ->and($sale->items[0]->qty)->toBe(5)
        ->and($sale->total)->toBe(15000);
});

test('keranjang kosong dan jumlah tidak valid ditolak', function () {
    $mie = produkSiapJual(10, 3000);

    expect(fn () => $this->sell->handle($this->kasir, [], 1000))->toThrow(PosException::class, 'kosong');

    foreach ([0, -1, 'abc', 1.5] as $bad) {
        expect(fn () => $this->sell->handle($this->kasir, [['product_unit_id' => $mie->baseUnit->id, 'qty' => $bad]], 100000))
            ->toThrow(PosException::class, 'bilangan bulat');
    }

    expect(Sale::count())->toBe(0);
});

test('produk nonaktif, satuan terhapus, dan satuan tak dikenal ditolak', function () {
    $nonaktif = produkSiapJual(10, 3000, 'Produk Mati');
    $nonaktif->update(['is_active' => false]);

    expect(fn () => $this->sell->handle($this->kasir, [itemDari($nonaktif->baseUnit, 1)], 100000))
        ->toThrow(PosException::class, 'nonaktif');

    $aktif = produkSiapJual(10, 3000, 'Produk Hidup');
    $dus = ProductUnit::factory()->for($aktif)->create(['name' => 'dus', 'conversion' => 12, 'barcode' => null]);
    $dus->delete();

    expect(fn () => $this->sell->handle($this->kasir, [itemDari($dus, 1)], 100000))
        ->toThrow(PosException::class, 'tidak ditemukan');

    expect(fn () => $this->sell->handle($this->kasir, [['product_unit_id' => 999999, 'qty' => 1]], 100000))
        ->toThrow(PosException::class, 'tidak ditemukan');

    expect(Sale::count())->toBe(0);
});

test('total nol ditolak', function () {
    $gratis = produkSiapJual(10, 0, 'Gratisan');

    expect(fn () => $this->sell->handle($this->kasir, [itemDari($gratis->baseUnit, 1)], 0))
        ->toThrow(PosException::class, 'lebih dari nol');
});

test('salinan nama dan harga bertahan setelah produk diubah', function () {
    $mie = produkSiapJual(10, 3000, 'Mie Lama');
    $sale = $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 1)], 3000);

    $mie->update(['name' => 'Mie Baru']);
    $mie->baseUnit->update(['sell_price' => 9999]);

    $item = SaleItem::where('sale_id', $sale->id)->firstOrFail();

    expect($item->product_name)->toBe('Mie Lama')
        ->and($item->unit_price)->toBe(3000)
        ->and($item->line_total)->toBe(3000);
});

test('nomor INV berurutan per hari', function () {
    $mie = produkSiapJual(10, 1000);

    $a = $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 1)], 1000);
    $b = $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 1)], 1000);

    $prefix = 'INV-'.now()->timezone(config('app.display_timezone'))->format('Ymd').'-';

    expect($a->number)->toBe($prefix.'0001')->and($b->number)->toBe($prefix.'0002');
});

test('mutasi stok terhubung ke baris penjualan', function () {
    $mie = produkSiapJual(10, 1000);
    $sale = $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 4)], 4000);

    $movement = StockMovement::where('sale_item_id', $sale->items[0]->id)->firstOrFail();

    expect($movement->qty)->toBe(-4)
        ->and($movement->balance_after)->toBe(6)
        ->and($movement->created_by)->toBe($this->kasir->id);
});

test('penjualan butuh shift aktif milik kasir itu', function () {
    $mie = produkSiapJual(10, 1000);
    $tanpaShift = User::factory()->create()->assignRole('kasir');

    expect(fn () => $this->sell->handle($tanpaShift, [itemDari($mie->baseUnit, 1)], 1000))
        ->toThrow(PosException::class, 'shift');

    // Shift milik kasir lain tidak dipakai.
    expect(Sale::count())->toBe(0);
});

test('model penjualan tidak bisa diubah atau dihapus lewat Eloquent', function () {
    // Perlindungan hanya di model; query langsung tidak dijaga dan tidak diuji (tanpa trigger).
    $mie = produkSiapJual(10, 1000);
    $sale = $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 1)], 1000);

    expect(fn () => $sale->update(['total' => 1]))->toThrow(LogicException::class);
    expect(fn () => $sale->delete())->toThrow(LogicException::class);
    expect(fn () => $sale->items[0]->update(['qty' => 9]))->toThrow(LogicException::class);
    expect(fn () => $sale->payments[0]->delete())->toThrow(LogicException::class);

    expect(Sale::find($sale->id)->total)->toBe(1000);
});

test('SaleCompleted terpancar dengan muatan benar, dan tidak saat gagal', function () {
    Event::fake([SaleCompleted::class]);
    $mie = produkSiapJual(2, 3000, 'Mie Instan');

    expect(fn () => $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 5)], 100000))
        ->toThrow(StockException::class);
    Event::assertNotDispatched(SaleCompleted::class);

    $sale = $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 2)], 6000);

    Event::assertDispatchedTimes(SaleCompleted::class, 1);
    Event::assertDispatched(SaleCompleted::class, fn (SaleCompleted $e) => $e->saleId === $sale->id
        && $e->total === 6000
        && $e->number === $sale->number
        && $e->items === [['name' => 'Mie Instan', 'unit' => 'pcs', 'qty' => 2]]
        && $e->cashierId === $this->kasir->id);
});

test('penjualan tidak menulis activity_logs (tabel sales sudah jadi catatannya)', function () {
    $mie = produkSiapJual(10, 1000);
    $before = ActivityLog::count();

    $this->sell->handle($this->kasir, [itemDari($mie->baseUnit, 1)], 1000);

    expect(ActivityLog::count())->toBe($before);
});
