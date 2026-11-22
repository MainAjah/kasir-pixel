<?php

use App\Actions\Inventory\AdjustStock;
use App\Actions\Pos\SimulateSale;
use App\Enums\Role;
use App\Enums\StockMovementType;
use App\Events\SaleCompleted;
use App\Exceptions\PosException;
use App\Models\CashShift;
use App\Models\Category;
use App\Models\Member;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Sale;
use App\Models\SavingsEntry;
use App\Models\StockMovement;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoDataSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Event;

/** Jalankan blok seolah-olah di lingkungan lokal (database tes di-rollback RefreshDatabase). */
function sebagaiLokal(Closure $block): void
{
    $app = app();
    $original = $app['env'];
    $app['env'] = 'local';

    try {
        $block();
    } finally {
        $app['env'] = $original;
    }
}

function akunDemo(): void
{
    test()->seed(RoleSeeder::class);
    User::factory()->create(['email' => 'admin@kasir.test'])->assignRole(Role::Admin->value);
    User::factory()->create(['email' => 'kasir@kasir.test'])->assignRole(Role::Kasir->value);
}

// --- Seeder ------------------------------------------------------------------

test('seeder demo tidak melakukan apa-apa di luar lingkungan lokal', function () {
    akunDemo();

    expect(app()->environment('local'))->toBeFalse();

    $this->seed(DemoDataSeeder::class);

    expect(Product::count())->toBe(0)
        ->and(Member::count())->toBe(0)
        ->and(CashShift::count())->toBe(0);
});

test('DatabaseSeeder tidak membuat data contoh di database tes', function () {
    $this->seed(DatabaseSeeder::class);

    expect(User::count())->toBe(3)
        ->and(Product::count())->toBe(0)
        ->and(Category::count())->toBe(0);
});

test('seeder lokal membuat kategori, sekitar 20 produk dengan satuan dan barcode', function () {
    akunDemo();
    sebagaiLokal(fn () => $this->seed(DemoDataSeeder::class));

    expect(Category::where('name', 'Minuman')->exists())->toBeTrue()
        ->and(Product::count())->toBeBetween(18, 24);

    foreach (Product::with('units')->get() as $product) {
        expect($product->units->where('is_base', true))->toHaveCount(1)
            ->and($product->units->every(fn ($u) => $u->barcode !== null && $u->sell_price > 0))->toBeTrue();
    }

    // Ada satuan bertingkat (dus) dan semua barcode unik.
    expect(ProductUnit::where('conversion', '>', 1)->exists())->toBeTrue()
        ->and(ProductUnit::pluck('barcode')->unique()->count())->toBe(ProductUnit::count());

    expect(Category::where('name', 'Minuman')->first()->products()->count())->toBeGreaterThanOrEqual(4);
});

test('stok awal lewat ledger dengan campuran kosong, sedikit, setengah, dan penuh', function () {
    akunDemo();
    sebagaiLokal(fn () => $this->seed(DemoDataSeeder::class));

    $stocks = Product::withStock()->get()->pluck('stock')->map(fn ($s) => (int) $s);

    expect($stocks->contains(0))->toBeTrue();

    foreach (DemoDataSeeder::LEVELS as $qty) {
        expect($stocks->contains($qty))->toBeTrue();
    }

    // Stok hanya dari ledger: tiap saldo = jumlah mutasi, tidak ada yang minus.
    foreach (Product::all() as $product) {
        expect($product->currentStock())->toBe((int) $product->movements()->sum('qty'))
            ->and($product->currentStock())->toBeGreaterThanOrEqual(0);
    }

    expect(StockMovement::where('type', '!=', 'opening')->count())->toBe(0);
});

test('anggota contoh punya simpanan lewat ledger dan shift demo kasir terbuka', function () {
    akunDemo();
    sebagaiLokal(fn () => $this->seed(DemoDataSeeder::class));

    expect(Member::count())->toBeGreaterThanOrEqual(3)
        ->and(SavingsEntry::where('balance_after', '<', 0)->count())->toBe(0);

    $kasir = User::where('email', 'kasir@kasir.test')->first();
    $shift = CashShift::activeFor($kasir);

    expect($shift)->not->toBeNull()
        ->and($shift->opening_cash)->toBe(DemoDataSeeder::OPENING_CASH);
});

test('seeder aman dijalankan ulang tanpa menggandakan data', function () {
    akunDemo();

    sebagaiLokal(function () {
        $this->seed(DemoDataSeeder::class);
        $counts = [Product::count(), Member::count(), CashShift::count(), StockMovement::count(), Category::count()];

        $this->seed(DemoDataSeeder::class);

        expect([Product::count(), Member::count(), CashShift::count(), StockMovement::count(), Category::count()])->toBe($counts);
    });
});

test('seeder gagal jelas bila akun demo belum ada', function () {
    $this->seed(RoleSeeder::class);

    sebagaiLokal(fn () => expect(fn () => $this->seed(DemoDataSeeder::class))->toThrow(RuntimeException::class));
});

// --- Simulasi pesanan ----------------------------------------------------------

function dataDemo(): void
{
    akunDemo();
    sebagaiLokal(fn () => test()->seed(DemoDataSeeder::class));
}

test('simulasi membuat satu penjualan sungguhan atas nama kasir contoh dengan shift demo', function () {
    dataDemo();
    Event::fake([SaleCompleted::class]);

    $sale = app(SimulateSale::class)->handle();

    $kasir = User::where('email', 'kasir@kasir.test')->first();

    expect($sale->created_by)->toBe($kasir->id)
        ->and($sale->cashShift->id)->toBe(CashShift::activeFor($kasir)->id)
        ->and($sale->items->count())->toBeGreaterThanOrEqual(1)
        ->and($sale->total)->toBe($sale->items->sum('line_total'))
        ->and($sale->payments->first()->tendered)->toBeGreaterThanOrEqual($sale->total);

    Event::assertDispatched(SaleCompleted::class);
});

test('simulasi mengurangi stok lewat ledger dan tidak pernah membuat stok minus', function () {
    dataDemo();

    // Banyak pesanan sampai stok menipis: tidak ada saldo minus, tidak ada pengecualian tak terduga.
    for ($i = 0; $i < 150; $i++) {
        try {
            app(SimulateSale::class)->handle();
        } catch (PosException) {
            break;
        }
    }

    expect(StockMovement::where('balance_after', '<', 0)->count())->toBe(0);

    foreach (Product::all() as $product) {
        expect($product->currentStock())->toBeGreaterThanOrEqual(0)
            ->and($product->currentStock())->toBe((int) $product->movements()->sum('qty'));
    }

    expect(StockMovement::where('type', 'sale')->count())->toBeGreaterThan(0);
});

test('simulasi hanya memilih produk yang punya stok dan aktif', function () {
    dataDemo();

    $kosong = Product::withStock()->get()->filter(fn ($p) => $p->stock === 0 || $p->stock === null)->pluck('id');
    $nonaktif = Product::withStock()->get()->first(fn ($p) => $p->stock > 0);
    $nonaktif->update(['is_active' => false]);

    for ($i = 0; $i < 20; $i++) {
        app(SimulateSale::class)->handle();
    }

    $dijual = DB::table('sale_items')->pluck('product_id')->unique();

    expect($dijual->intersect($kosong))->toBeEmpty()
        ->and($dijual->contains($nonaktif->id))->toBeFalse();
});

test('simulasi membuka shift demo bila belum ada, dan gagal jelas tanpa kasir atau stok', function () {
    dataDemo();
    $kasir = User::where('email', 'kasir@kasir.test')->first();
    CashShift::activeFor($kasir)->forceFill(['closed_at' => now(), 'counted_cash' => 0, 'expected_cash' => 0, 'difference' => 0])->save();

    app(SimulateSale::class)->handle();

    expect(CashShift::where('user_id', $kasir->id)->whereNull('closed_at')->count())->toBe(1);

    // Semua stok habis: pesan jelas, tidak ada penjualan baru.
    foreach (Product::all() as $product) {
        $stok = $product->currentStock();

        if ($stok > 0) {
            app(AdjustStock::class)->handle(
                $product,
                StockMovementType::Adjustment,
                $product->baseUnit,
                -$stok,
                $kasir->id,
                note: 'kosongkan untuk tes',
            );
        }
    }

    $sebelum = Sale::count();

    expect(fn () => app(SimulateSale::class)->handle())->toThrow(PosException::class, 'stok');
    expect(Sale::count())->toBe($sebelum);

    User::where('email', 'kasir@kasir.test')->update(['email' => 'lain@kasir.test']);
    expect(fn () => app(SimulateSale::class)->handle())->toThrow(PosException::class, 'Kasir contoh');
});

// --- Tombol (HTTP) -----------------------------------------------------------

test('admin menekan tombol simulasi: satu penjualan tercatat dan peristiwa diorama dititipkan', function () {
    dataDemo();
    $admin = User::where('email', 'admin@kasir.test')->first();

    $this->actingAs($admin)
        ->from(route('diorama.lab'))
        ->post(route('diorama.simulate'))
        ->assertRedirect(route('diorama.lab'))
        ->assertSessionHas('inertia.flash_data.store_event.name', 'sale.completed')
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    expect(Sale::count())->toBe(1);
});

test('tombol simulasi menampilkan pesan bila tidak ada stok, tanpa penjualan', function () {
    akunDemo();
    $admin = User::where('email', 'admin@kasir.test')->first();

    $this->actingAs($admin)
        ->from(route('diorama.lab'))
        ->post(route('diorama.simulate'))
        ->assertRedirect(route('diorama.lab'))
        ->assertSessionHas('inertia.flash_data.toast.type', 'error');

    expect(Sale::count())->toBe(0);
});

test('hanya admin boleh menekan tombol simulasi', function () {
    dataDemo();

    foreach (['kasir@kasir.test'] as $email) {
        $this->actingAs(User::where('email', $email)->first())->post(route('diorama.simulate'))->assertForbidden();
    }

    $bendahara = User::factory()->create()->assignRole(Role::Bendahara->value);
    $this->actingAs($bendahara)->post(route('diorama.simulate'))->assertForbidden();

    auth()->logout();
    $this->post(route('diorama.simulate'))->assertRedirect(route('login'));

    expect(Sale::count())->toBe(0);
});
