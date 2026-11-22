<?php

use App\Actions\Dashboard\ShelfStock;
use App\Actions\Pos\CompleteSale;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

function produkRak(string $nama, int $stok, int $min = 10, ?Category $kategori = null, bool $aktif = true): Product
{
    $product = produkSiapJual($stok, 1000, $nama);
    $product->update(['min_stock' => $min, 'category_id' => $kategori?->id, 'is_active' => $aktif]);

    return $product;
}

test('batas isi per produk mengikuti stok minimum', function (int $stok, int $min, string $isi) {
    expect(ShelfStock::levelFor($stok, $min))->toBe($isi);
})->with([
    'stok 0' => [0, 10, 'kosong'],
    'stok minus (berjaga-jaga)' => [-2, 10, 'kosong'],
    'stok 1' => [1, 10, 'sedikit'],
    'tepat minimum' => [10, 10, 'sedikit'],
    'satu di atas minimum' => [11, 10, 'setengah'],
    'tepat 3x minimum' => [30, 10, 'setengah'],
    'satu di atas 3x minimum' => [31, 10, 'penuh'],
    'data contoh sedikit' => [6, 10, 'sedikit'],
    'data contoh setengah' => [25, 10, 'setengah'],
    'data contoh penuh' => [60, 10, 'penuh'],
    'minimum 0 memakai patokan 5: 5' => [5, 0, 'sedikit'],
    'minimum 0 memakai patokan 5: 6' => [6, 0, 'setengah'],
    'minimum 0 memakai patokan 5: 15' => [15, 0, 'setengah'],
    'minimum 0 memakai patokan 5: 16' => [16, 0, 'penuh'],
]);

test('sedikit sama persis dengan stok menipis di kartu Hari Ini', function () {
    foreach ([0, 1, 9, 10, 11, 40] as $stok) {
        produkRak("Produk {$stok}", $stok, 10);
    }

    $shelves = app(ShelfStock::class)->handle();
    $menipis = collect($shelves['rak'])->filter(fn ($isi) => in_array($isi, ['kosong', 'sedikit']))->count();

    expect($menipis)->toBe(Product::query()->where('is_active', true)->lowStock()->count());
});

test('Minuman ke vending urut nama, produk lain ke rak urut kategori lalu nama', function () {
    $minuman = Category::factory()->create(['name' => 'Minuman']);
    $sembako = Category::factory()->create(['name' => 'Sembako']);
    $rumah = Category::factory()->create(['name' => 'Kebutuhan rumah']);

    produkRak('Teh botol', 0, 10, $minuman);         // kosong
    produkRak('Air mineral', 60, 10, $minuman);      // penuh
    produkRak('Beras', 6, 10, $sembako);             // sedikit
    produkRak('Sabun', 25, 10, $rumah);              // setengah
    produkRak('Detergen', 60, 10, $rumah);           // penuh
    produkRak('Tanpa kategori', 0, 10);              // kosong, paling akhir
    produkRak('Nonaktif', 60, 10, $sembako, false);  // tidak ikut

    expect(app(ShelfStock::class)->handle())->toBe([
        'rak' => ['penuh', 'setengah', 'sedikit', 'kosong'],
        'vending' => ['penuh', 'kosong'],
    ]);
});

test('toko tanpa produk: rak dan vending kosong', function () {
    expect(app(ShelfStock::class)->handle())->toBe(['rak' => [], 'vending' => []]);
});

test('isi rak mengikuti stok terbaru di ledger setelah penjualan', function () {
    $this->seed(RoleSeeder::class);
    [$kasir] = kasirDenganShift();
    $mie = produkRak('Mi instan', 31, 10);

    expect(app(ShelfStock::class)->handle()['rak'])->toBe(['penuh']);

    app(CompleteSale::class)->handle($kasir, [['product_unit_id' => $mie->baseUnit->id, 'qty' => 1]], 1000);

    expect(app(ShelfStock::class)->handle()['rak'])->toBe(['setengah']);
});

test('Beranda mengirim isi rak untuk semua peran', function (string $role) {
    $this->seed(RoleSeeder::class);
    produkRak('Beras', 6, 10);

    $this->actingAs(User::factory()->create()->assignRole($role))
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('shelves.rak', ['sedikit'])
            ->where('shelves.vending', []));
})->with(['admin', 'kasir', 'bendahara']);
