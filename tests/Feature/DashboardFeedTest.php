<?php

use App\Actions\Dashboard\DashboardFeed;
use App\Actions\Pos\CompleteSale;
use App\Actions\Pos\VoidSale;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    [$this->kasir] = kasirDenganShift();
    $this->admin = User::factory()->create()->assignRole('admin');
    $this->mie = produkSiapJual(100, 3000, 'Mi instan');
    $this->mie->update(['min_stock' => 10]);
});

function jualMie(User $kasir, Product $mie, int $qty = 1): Sale
{
    return app(CompleteSale::class)->handle($kasir, [
        ['product_unit_id' => $mie->baseUnit->id, 'qty' => $qty],
    ], 3000 * $qty);
}

function feedUrl(array $cursor): string
{
    return route('dashboard.feed', $cursor);
}

test('Beranda membawa kursor terakhir supaya penjualan lama tidak diputar ulang', function () {
    $sale = jualMie($this->kasir, $this->mie);

    $this->actingAs($this->admin)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('cursor.sale', $sale->id)
            ->where('cursor.void', 0));
});

test('polling mengembalikan penjualan setelah kursor, urut lama ke baru, dengan barangnya', function () {
    $lama = jualMie($this->kasir, $this->mie);
    $cursor = DashboardFeed::cursor();
    $a = jualMie($this->kasir, $this->mie, 2);
    $b = jualMie($this->kasir, $this->mie, 3);

    $this->actingAs($this->admin)
        ->getJson(feedUrl($cursor))
        ->assertOk()
        ->assertJsonPath('sales.0.number', $a->number)
        ->assertJsonPath('sales.0.total', 6000)
        ->assertJsonPath('sales.0.items.0', ['name' => 'Mi instan', 'unit' => 'pcs', 'qty' => 2])
        ->assertJsonPath('sales.1.number', $b->number)
        ->assertJsonCount(2, 'sales')
        ->assertJsonPath('cursor.sale', $b->id)
        ->assertJsonPath('today.sales_count', 3)
        ->assertJsonPath('today.sales_total', 18000);

    expect($lama->id)->toBeLessThan($a->id);
});

test('tanpa penjualan baru: daftar kosong dan kursor tetap', function () {
    jualMie($this->kasir, $this->mie);
    $cursor = DashboardFeed::cursor();

    $this->actingAs($this->admin)
        ->getJson(feedUrl($cursor))
        ->assertJsonCount(0, 'sales')
        ->assertJsonCount(0, 'voids')
        ->assertJsonPath('cursor', $cursor);
});

test('banyak penjualan sekaligus: hanya 10 terbaru yang diputar, kursor ke yang terakhir', function () {
    $cursor = DashboardFeed::cursor();
    $sales = collect(range(1, 13))->map(fn () => jualMie($this->kasir, $this->mie));

    $response = $this->actingAs($this->admin)->getJson(feedUrl($cursor));

    $response->assertJsonCount(DashboardFeed::MAX_SALES, 'sales')
        ->assertJsonPath('sales.0.number', $sales[3]->number)
        ->assertJsonPath('sales.9.number', $sales[12]->number)
        ->assertJsonPath('cursor.sale', $sales[12]->id)
        ->assertJsonPath('today.sales_count', 13);
});

test('pembatalan baru ikut dikirim, dan angka Hari Ini serta isi rak mengikuti', function () {
    $sale = jualMie($this->kasir, $this->mie, 60);
    $cursor = DashboardFeed::cursor();
    app(VoidSale::class)->handle($sale, $this->admin, 'tes polling');

    $this->actingAs($this->admin)
        ->getJson(feedUrl($cursor))
        ->assertJsonPath('voids.0', ['number' => $sale->number, 'total' => 180000])
        ->assertJsonPath('today.sales_count', 0)
        ->assertJsonPath('shelves.rak', ['penuh'])
        ->assertJsonPath('cursor.void', $sale->void->id);
});

test('isi rak di polling ikut menipis setelah penjualan', function () {
    $cursor = DashboardFeed::cursor();

    $this->actingAs($this->admin)->getJson(feedUrl($cursor))->assertJsonPath('shelves.rak', ['penuh']);

    jualMie($this->kasir, $this->mie, 95); // sisa 5

    $this->actingAs($this->admin)->getJson(feedUrl($cursor))->assertJsonPath('shelves.rak', ['sedikit']);
});

test('semua peran boleh membaca polling, tamu tidak', function (string $role) {
    $this->actingAs(User::factory()->create()->assignRole($role))
        ->getJson(feedUrl(['sale' => 0, 'void' => 0]))
        ->assertOk();
})->with(['admin', 'kasir', 'bendahara']);

test('tamu ditolak dan kursor wajib angka', function () {
    $this->getJson(feedUrl(['sale' => 0, 'void' => 0]))->assertUnauthorized();

    $this->actingAs($this->admin)
        ->getJson(route('dashboard.feed', ['sale' => 'x']))
        ->assertUnprocessable();
});

test('polling hanya membaca: tidak menulis apa pun', function () {
    jualMie($this->kasir, $this->mie);
    $tables = ['sales', 'sale_items', 'payments', 'stock_movements', 'sale_voids', 'activity_logs', 'cash_shifts'];
    $before = collect($tables)->mapWithKeys(fn ($t) => [$t => DB::table($t)->count()]);

    $this->actingAs($this->admin)->getJson(feedUrl(['sale' => 0, 'void' => 0]))->assertOk();

    expect(collect($tables)->mapWithKeys(fn ($t) => [$t => DB::table($t)->count()]))->toEqual($before);
});
