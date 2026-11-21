<?php

use App\Actions\Inventory\AdjustStock;
use App\Actions\Pos\OpenShift;
use App\Enums\StockMovementType;
use App\Models\CashShift;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/** Isi stok produk lewat satu-satunya pintu ledger (saldo awal, atau koreksi tambah bila sudah ada mutasi). */
function isiStok(Product $product, int $qty, ?ProductUnit $unit = null): void
{
    $user = User::factory()->create();
    $adjust = app(AdjustStock::class);

    if ($product->movements()->exists()) {
        $adjust->handle($product, StockMovementType::Adjustment, $unit ?? $product->baseUnit, $qty, $user->id, note: 'isi stok tes');
    } else {
        $adjust->handle($product, StockMovementType::Opening, $unit ?? $product->baseUnit, $qty, $user->id);
    }
}

/**
 * Buat pengguna dengan shift terbuka. Mengembalikan [user, shift].
 *
 * @return array{0: User, 1: CashShift}
 */
function kasirDenganShift(int $kasAwal = 100000, string $role = 'kasir'): array
{
    $user = User::factory()->create();
    $user->assignRole($role);
    $shift = app(OpenShift::class)->handle($user, $kasAwal);

    return [$user, $shift];
}

/** Produk dengan satuan dasar (harga $harga) dan stok $stok. */
function produkSiapJual(int $stok = 100, int $harga = 3000, string $nama = 'Mie Instan'): Product
{
    $product = Product::factory()->create(['name' => $nama]);
    $product->baseUnit->update(['sell_price' => $harga]);

    if ($stok > 0) {
        isiStok($product, $stok);
    }

    return $product->refresh();
}
