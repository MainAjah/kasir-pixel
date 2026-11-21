<?php

use App\Actions\Pos\CloseShift;
use App\Actions\Pos\CompleteSale;
use App\Actions\Pos\OpenShift;
use App\Actions\Pos\VoidSale;
use App\Exceptions\PosException;
use App\Models\ActivityLog;
use App\Models\CashShift;
use App\Models\Sale;
use App\Models\User;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->open = app(OpenShift::class);
    $this->close = app(CloseShift::class);
});

function jual(User $kasir, $produk, int $qty, int $bayar): Sale
{
    return app(CompleteSale::class)->handle($kasir, [['product_unit_id' => $produk->baseUnit->id, 'qty' => $qty]], $bayar);
}

test('membuka shift mencatat kas awal dan log', function () {
    $kasir = User::factory()->create()->assignRole('kasir');

    $shift = $this->open->handle($kasir, 150000);

    expect($shift->isOpen())->toBeTrue()
        ->and($shift->opening_cash)->toBe(150000)
        ->and($shift->user_id)->toBe($kasir->id)
        ->and(ActivityLog::where('action', 'shift.opened')->count())->toBe(1);
});

test('kas awal negatif ditolak', function () {
    $kasir = User::factory()->create()->assignRole('kasir');

    expect(fn () => $this->open->handle($kasir, -1))->toThrow(PosException::class);
    expect(CashShift::count())->toBe(0);
});

test('satu kasir tidak boleh punya dua shift aktif', function () {
    $kasir = User::factory()->create()->assignRole('kasir');
    $this->open->handle($kasir, 0);

    expect(fn () => $this->open->handle($kasir, 0))->toThrow(PosException::class, 'masih punya shift');
    expect(CashShift::count())->toBe(1);
});

test('dua kasir masing-masing punya satu shift aktif', function () {
    $a = User::factory()->create()->assignRole('kasir');
    $b = User::factory()->create()->assignRole('kasir');

    $this->open->handle($a, 0);
    $this->open->handle($b, 0);

    expect(CashShift::whereNull('closed_at')->count())->toBe(2)
        ->and(CashShift::activeFor($a)->user_id)->toBe($a->id)
        ->and(CashShift::activeFor($b)->user_id)->toBe($b->id);
});

test('setelah ditutup, kasir boleh membuka shift baru', function () {
    [$kasir, $shift] = kasirDenganShift(50000);
    $this->close->handle($shift, $kasir, 50000);

    $baru = $this->open->handle($kasir, 70000);

    expect($baru->id)->not->toBe($shift->id)->and($baru->isOpen())->toBeTrue();
});

test('tutup shift menghitung expected_cash dari kas awal dan penjualan tunai', function () {
    [$kasir, $shift] = kasirDenganShift(100000);
    $mie = produkSiapJual(50, 3000);

    jual($kasir, $mie, 3, 10000);  // 9.000
    jual($kasir, $mie, 1, 5000);   // 3.000

    $closed = $this->close->handle($shift, $kasir, 112000);

    expect($closed->expected_cash)->toBe(112000)
        ->and($closed->counted_cash)->toBe(112000)
        ->and($closed->difference)->toBe(0)
        ->and($closed->isOpen())->toBeFalse()
        ->and($closed->closing_note)->toBeNull();
});

test('kembalian tidak masuk hitungan: yang dihitung adalah jumlah bayar, bukan uang diterima', function () {
    [$kasir, $shift] = kasirDenganShift(0);
    $mie = produkSiapJual(10, 3000);

    jual($kasir, $mie, 1, 50000); // diterima 50.000, kembali 47.000, masuk laci 3.000

    expect($shift->computeExpectedCash())->toBe(3000);
});

test('penjualan yang dibatalkan dikecualikan dari expected_cash', function () {
    [$kasir, $shift] = kasirDenganShift(100000);
    $admin = User::factory()->create()->assignRole('admin');
    $mie = produkSiapJual(50, 3000);

    jual($kasir, $mie, 2, 6000);
    $batal = jual($kasir, $mie, 5, 15000);
    app(VoidSale::class)->handle($batal, $admin, 'batal');

    $closed = $this->close->handle($shift, $kasir, 106000);

    expect($closed->expected_cash)->toBe(106000)->and($closed->difference)->toBe(0);
});

test('selisih kurang dan lebih tersimpan bertanda dan wajib bercatatan', function () {
    [$kasir, $shift] = kasirDenganShift(100000);

    expect(fn () => $this->close->handle($shift, $kasir, 95000))
        ->toThrow(PosException::class, 'catatan');
    expect(fn () => $this->close->handle($shift, $kasir, 95000, '   '))
        ->toThrow(PosException::class, 'catatan');
    expect($shift->fresh()->isOpen())->toBeTrue();

    $closed = $this->close->handle($shift, $kasir, 95000, 'uang kembalian salah');

    expect($closed->difference)->toBe(-5000)
        ->and($closed->closing_note)->toBe('uang kembalian salah');

    [$kasir2, $shift2] = kasirDenganShift(100000);
    $lebih = $this->close->handle($shift2, $kasir2, 100500, 'ada uang tip');

    expect($lebih->difference)->toBe(500);
});

test('penutupan tercatat di activity_logs', function () {
    [$kasir, $shift] = kasirDenganShift(100000);

    $this->close->handle($shift, $kasir, 90000, 'hilang');

    $log = ActivityLog::where('action', 'shift.closed')->firstOrFail();

    expect($log->properties)->toMatchArray(['expected_cash' => 100000, 'counted_cash' => 90000, 'difference' => -10000]);
});

test('shift tidak bisa ditutup dua kali', function () {
    [$kasir, $shift] = kasirDenganShift(0);
    $this->close->handle($shift, $kasir, 0);

    expect(fn () => $this->close->handle($shift, $kasir, 0))->toThrow(PosException::class, 'sudah ditutup');
});

test('kasir lain tidak bisa menutup shift orang lain', function () {
    [, $shift] = kasirDenganShift(0);
    $lain = User::factory()->create()->assignRole('kasir');

    expect(fn () => $this->close->handle($shift, $lain, 0))->toThrow(PosException::class, 'pemilik');
    expect($shift->fresh()->isOpen())->toBeTrue();
});

test('uang hitung negatif ditolak', function () {
    [$kasir, $shift] = kasirDenganShift(0);

    expect(fn () => $this->close->handle($shift, $kasir, -1))->toThrow(PosException::class);
});

test('shift yang sudah ditutup tidak bisa diubah atau dihapus lewat model', function () {
    // Perlindungan hanya di model; query langsung tidak dijaga dan tidak diuji (tanpa trigger).
    [$kasir, $shift] = kasirDenganShift(100000);
    $closed = $this->close->handle($shift, $kasir, 100000);

    expect(fn () => $closed->update(['counted_cash' => 1]))->toThrow(LogicException::class);
    expect(fn () => $closed->delete())->toThrow(LogicException::class);
    expect($closed->fresh()->counted_cash)->toBe(100000);
});

test('shift tertutup tidak bisa dipakai menjual', function () {
    [$kasir, $shift] = kasirDenganShift(0);
    $mie = produkSiapJual(10, 1000);
    $this->close->handle($shift, $kasir, 0);

    expect(fn () => jual($kasir, $mie, 1, 1000))->toThrow(PosException::class, 'shift');
});
