<?php

use App\Actions\Dashboard\TodaySummary;
use App\Actions\Pos\CompleteSale;
use App\Actions\Pos\VoidSale;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function jualHariIni(User $kasir, Product $product, int $qty): Sale
{
    $price = $product->baseUnit->sell_price;

    return app(CompleteSale::class)->handle($kasir, [
        ['product_unit_id' => $product->baseUnit->id, 'qty' => $qty],
    ], $price * $qty);
}

test('kartu Hari Ini: jumlah dan banyak penjualan hari ini, tanpa yang dibatalkan dan tanpa kemarin', function () {
    [$kasir] = kasirDenganShift();
    $admin = User::factory()->create()->assignRole('admin');
    $mie = produkSiapJual(100, 3000);
    $mie->update(['min_stock' => 0]);

    // Kemarin (zona tampilan): tidak dihitung.
    $this->travelTo(now(config('app.display_timezone'))->subDay()->setTime(20, 0));
    jualHariIni($kasir, $mie, 5);
    $this->travelBack();

    jualHariIni($kasir, $mie, 2); // 6.000
    jualHariIni($kasir, $mie, 1); // 3.000
    $batal = jualHariIni($kasir, $mie, 4); // 12.000, lalu dibatalkan
    app(VoidSale::class)->handle($batal, $admin, 'tes beranda');

    expect(app(TodaySummary::class)->handle())->toBe([
        'sales_total' => 9000,
        'sales_count' => 2,
        'low_stock' => 0,
    ]);
});

test('hari ini mengikuti zona tampilan, bukan UTC', function () {
    [$kasir] = kasirDenganShift();
    $mie = produkSiapJual(100, 3000);

    // 23 Nov 00:30 WIB = 22 Nov 17:30 UTC: sudah "hari ini" untuk tanggal 23.
    $this->travelTo(Carbon::parse('2026-11-23 00:30', 'Asia/Jakarta'));
    jualHariIni($kasir, $mie, 1);

    // 22 Nov 23:50 WIB: hari sebelumnya.
    $this->travelTo(Carbon::parse('2026-11-22 23:50', 'Asia/Jakarta'));
    jualHariIni($kasir, $mie, 2);

    config(['app.display_timezone' => 'Asia/Jakarta']);
    $summary = app(TodaySummary::class)->handle(Carbon::parse('2026-11-23 10:00', 'Asia/Jakarta'));

    expect($summary['sales_count'])->toBe(1)
        ->and($summary['sales_total'])->toBe(3000);
});

test('stok menipis: produk aktif dengan stok di bawah atau sama dengan minimum, termasuk kosong', function () {
    produkSiapJual(50)->update(['min_stock' => 10]);   // aman
    produkSiapJual(10)->update(['min_stock' => 10]);   // tepat batas: menipis
    produkSiapJual(3)->update(['min_stock' => 10]);    // menipis
    produkSiapJual(0)->update(['min_stock' => 5]);     // kosong: menipis
    produkSiapJual(0)->update(['min_stock' => 5, 'is_active' => false]); // nonaktif: tidak dihitung

    expect(app(TodaySummary::class)->handle()['low_stock'])->toBe(3);
});

test('Beranda menampilkan kartu Hari Ini untuk semua peran', function (string $role) {
    $user = User::factory()->create()->assignRole($role);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('today.sales_total', 0)
            ->where('today.sales_count', 0)
            ->where('today.low_stock', 0));
})->with(['admin', 'kasir', 'bendahara']);

test('Beranda hanya membaca: membuka halaman tidak menulis apa pun', function () {
    $user = User::factory()->create()->assignRole('admin');
    produkSiapJual(5);
    $before = [Sale::count(), DB::table('stock_movements')->count(), DB::table('activity_logs')->count()];

    $this->actingAs($user)->get(route('dashboard'))->assertOk();

    expect([Sale::count(), DB::table('stock_movements')->count(), DB::table('activity_logs')->count()])->toBe($before);
});
