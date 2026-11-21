<?php

use App\Actions\Inventory\AdjustStock;
use App\Actions\Pos\CloseShift;
use App\Actions\Pos\CompleteSale;
use App\Actions\Pos\VoidSale;
use App\Enums\StockMovementType;
use App\Events\SaleVoided;
use App\Exceptions\PosException;
use App\Exceptions\StockException;
use App\Models\ActivityLog;
use App\Models\ProductUnit;
use App\Models\SaleVoid;
use App\Models\StockMovement;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    [$this->kasir, $this->shift] = kasirDenganShift();
    $this->admin = User::factory()->create()->assignRole('admin');
    $this->mie = produkSiapJual(10, 3000);
    $this->sale = app(CompleteSale::class)->handle($this->kasir, [
        ['product_unit_id' => $this->mie->baseUnit->id, 'qty' => 3],
    ], 10000);
    $this->void = app(VoidSale::class);
});

test('pembatalan mengembalikan stok persis lewat mutasi sale_void', function () {
    expect($this->mie->currentStock())->toBe(7);

    $void = $this->void->handle($this->sale, $this->admin, 'salah scan');

    $item = $this->sale->items[0];
    $movements = StockMovement::where('sale_item_id', $item->id)->orderBy('id')->get();
    $original = $movements[0];
    $reversal = $movements[1];

    expect($void->reason)->toBe('salah scan')
        ->and($void->created_by)->toBe($this->admin->id)
        ->and($this->mie->currentStock())->toBe(10)
        ->and($movements)->toHaveCount(2)
        ->and($original->type)->toBe(StockMovementType::Sale)
        ->and($reversal->type)->toBe(StockMovementType::SaleVoid)
        ->and($reversal->qty)->toBe(3)
        ->and($reversal->reverses_movement_id)->toBe($original->id)
        ->and($this->sale->fresh()->isVoided())->toBeTrue();
});

test('pembatalan mengembalikan stok dus sebesar isi dus', function () {
    $dus = ProductUnit::factory()->for($this->mie)->create(['name' => 'dus', 'conversion' => 6, 'sell_price' => 17000]);
    isiStok($this->mie, 20);
    $sale = app(CompleteSale::class)->handle($this->kasir, [['product_unit_id' => $dus->id, 'qty' => 2]], 34000);
    $sebelum = $this->mie->currentStock();

    $this->void->handle($sale, $this->admin, 'batal dus');

    expect($this->mie->currentStock())->toBe($sebelum + 12);
});

test('penjualan hanya bisa dibatalkan sekali', function () {
    $this->void->handle($this->sale, $this->admin, 'pertama');

    expect(fn () => $this->void->handle($this->sale, $this->admin, 'kedua'))
        ->toThrow(PosException::class, 'sudah dibatalkan');

    expect(SaleVoid::count())->toBe(1)->and($this->mie->currentStock())->toBe(10);
});

test('alasan wajib diisi', function () {
    foreach (['', '   '] as $kosong) {
        expect(fn () => $this->void->handle($this->sale, $this->admin, $kosong))
            ->toThrow(PosException::class, 'Alasan');
    }

    expect(SaleVoid::count())->toBe(0)->and($this->mie->currentStock())->toBe(7);
});

test('pembatalan setelah shift ditutup ditolak', function () {
    app(CloseShift::class)->handle($this->shift, $this->kasir, 109000);

    expect(fn () => $this->void->handle($this->sale, $this->admin, 'terlambat'))
        ->toThrow(PosException::class, 'sudah ditutup');

    expect(SaleVoid::count())->toBe(0)->and($this->mie->currentStock())->toBe(7);
});

test('kasir tidak boleh membatalkan penjualan', function () {
    expect(fn () => $this->void->handle($this->sale, $this->kasir, 'coba'))
        ->toThrow(PosException::class, 'admin');

    expect(SaleVoid::count())->toBe(0)->and($this->mie->currentStock())->toBe(7);
});

test('pembatalan tercatat di activity_logs dan memancarkan SaleVoided', function () {
    Event::fake([SaleVoided::class]);

    $this->void->handle($this->sale, $this->admin, 'pelanggan batal');

    $log = ActivityLog::where('action', 'sale.voided')->firstOrFail();
    expect($log->user_id)->toBe($this->admin->id)
        ->and($log->properties)->toMatchArray(['number' => $this->sale->number, 'total' => 9000, 'reason' => 'pelanggan batal']);

    Event::assertDispatchedTimes(SaleVoided::class, 1);
    Event::assertDispatched(SaleVoided::class, fn (SaleVoided $e) => $e->saleId === $this->sale->id && $e->reason === 'pelanggan batal');
});

test('SaleVoided tidak terpancar saat pembatalan gagal', function () {
    Event::fake([SaleVoided::class]);

    expect(fn () => $this->void->handle($this->sale, $this->admin, ''))->toThrow(PosException::class);

    Event::assertNotDispatched(SaleVoided::class);
});

test('penjualan yang dibatalkan tidak mengubah baris penjualan aslinya', function () {
    $this->void->handle($this->sale, $this->admin, 'batal');

    $fresh = $this->sale->fresh();

    expect($fresh->total)->toBe(9000)->and($fresh->items)->toHaveCount(1);
});

test('baris sale_void tidak bisa dibalik lagi dan hanya membalik mutasi sale', function () {
    $this->void->handle($this->sale, $this->admin, 'batal');

    $voidMovement = StockMovement::where('type', StockMovementType::SaleVoid)->firstOrFail();

    expect(fn () => app(AdjustStock::class)->reverse($voidMovement, $this->admin->id, 'lagi'))
        ->toThrow(StockException::class, 'tidak bisa dibalik');
});
