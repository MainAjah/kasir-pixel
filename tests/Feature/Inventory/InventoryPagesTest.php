<?php

use App\Actions\Inventory\AdjustStock;
use App\Enums\Role;
use App\Enums\StockMovementType;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Role::Admin->value);
});

test('hanya admin yang boleh membuka halaman inventaris', function (string $url) {
    foreach ([Role::Kasir, Role::Bendahara] as $role) {
        $user = User::factory()->create()->assignRole($role->value);
        $this->actingAs($user)->get($url)->assertForbidden();
    }

    auth()->logout();
    $this->get($url)->assertRedirect(route('login'));
    $this->actingAs($this->admin)->get($url)->assertOk();
})->with([
    '/produk/baru', '/penerimaan-barang', '/penerimaan-barang/baru', '/koreksi-stok', '/kategori',
]);

test('kasir dan bendahara tidak bisa menulis data inventaris', function (Role $role) {
    $user = User::factory()->create()->assignRole($role->value);

    $this->actingAs($user)->post('/kategori', ['name' => 'Minuman'])->assertForbidden();
    $this->actingAs($user)->post('/produk', [])->assertForbidden();
    $this->actingAs($user)->post('/penerimaan-barang', [])->assertForbidden();
    $this->actingAs($user)->post('/koreksi-stok', [])->assertForbidden();

    expect(Category::count())->toBe(0);
})->with([Role::Kasir, Role::Bendahara]);

test('admin membuat produk lewat formulir dan perubahan harga tercatat', function () {
    $payload = [
        'sku' => 'AIR-600',
        'name' => 'Air Mineral 600ml',
        'category_id' => null,
        'min_stock' => 24,
        'is_active' => true,
        'units' => [
            ['name' => 'botol', 'conversion' => 1, 'sell_price' => 3500, 'barcode' => '899000111', 'is_base' => true],
            ['name' => 'dus', 'conversion' => 24, 'sell_price' => 75000, 'barcode' => '899000222', 'is_base' => false],
        ],
    ];

    $this->actingAs($this->admin)->post('/produk', $payload)->assertSessionHasNoErrors();

    $product = Product::where('sku', 'AIR-600')->firstOrFail();
    expect($product->units)->toHaveCount(2);

    $units = $product->units->keyBy('name');
    $payload['units'][0] = ['id' => $units['botol']->id, ...$payload['units'][0], 'sell_price' => 4000];
    $payload['units'][1] = ['id' => $units['dus']->id, ...$payload['units'][1]];

    $this->actingAs($this->admin)->put("/produk/{$product->id}", $payload)->assertSessionHasNoErrors();

    expect(ActivityLog::where('action', 'product.price_changed')->count())->toBe(1);
});

test('SKU ganda ditolak dengan pesan validasi', function () {
    Product::factory()->create(['sku' => 'SAMA']);

    $this->actingAs($this->admin)->post('/produk', [
        'sku' => 'SAMA', 'name' => 'X', 'min_stock' => 0, 'is_active' => true,
        'units' => [['name' => 'pcs', 'conversion' => 1, 'sell_price' => 1, 'is_base' => true]],
    ])->assertSessionHasErrors('sku');
});

test('penerimaan barang lewat formulir menambah stok dan tampil di kartu stok', function () {
    $product = Product::factory()->create(['name' => 'Gula Pasir']);

    $this->actingAs($this->admin)->post('/penerimaan-barang', [
        'supplier_name' => 'Toko Sumber',
        'lines' => [['product_id' => $product->id, 'product_unit_id' => $product->baseUnit->id, 'qty' => 30, 'cost_total' => 90000]],
    ])->assertSessionHasNoErrors()->assertRedirect(route('stock-receipts.index'));

    expect($product->currentStock())->toBe(30);

    $this->actingAs($this->admin)->get("/produk/{$product->id}/kartu-stok")
        ->assertInertia(fn (Assert $page) => $page
            ->component('inventaris/produk/kartu-stok')
            ->where('product.stock', 30)
            ->has('movements.data', 1)
            ->where('movements.data.0.balance_after', 30));
});

test('penerimaan dengan satuan milik produk lain ditolak tanpa menyimpan apa pun', function () {
    $a = Product::factory()->create();
    $b = Product::factory()->create();

    $this->actingAs($this->admin)->post('/penerimaan-barang', [
        'lines' => [['product_id' => $a->id, 'product_unit_id' => $b->baseUnit->id, 'qty' => 5]],
    ])->assertSessionHasErrors('lines');

    expect(StockMovement::count())->toBe(0);
});

test('koreksi stok melebihi saldo ditolak dengan pesan, saldo awal dan koreksi tercatat', function () {
    $product = Product::factory()->create();
    $unit = $product->baseUnit;

    $this->actingAs($this->admin)->post('/koreksi-stok', [
        'product_id' => $product->id, 'product_unit_id' => $unit->id, 'kind' => 'opening', 'qty' => 10,
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->admin)->post('/koreksi-stok', [
        'product_id' => $product->id, 'product_unit_id' => $unit->id, 'kind' => 'decrease', 'qty' => 11, 'note' => 'hilang',
    ])->assertSessionHasErrors('qty');

    $this->actingAs($this->admin)->post('/koreksi-stok', [
        'product_id' => $product->id, 'product_unit_id' => $unit->id, 'kind' => 'decrease', 'qty' => 3, 'note' => 'rusak',
    ])->assertSessionHasNoErrors();

    expect($product->currentStock())->toBe(7)
        ->and(ActivityLog::where('action', 'stock.adjusted')->count())->toBe(1);
});

test('koreksi tanpa alasan ditolak, saldo awal tanpa alasan boleh', function () {
    $product = Product::factory()->create();
    $unit = $product->baseUnit;

    $this->actingAs($this->admin)->post('/koreksi-stok', [
        'product_id' => $product->id, 'product_unit_id' => $unit->id, 'kind' => 'increase', 'qty' => 1,
    ])->assertSessionHasErrors('note');
});

test('daftar produk menandai stok menipis dan bisa disaring', function () {
    $low = Product::factory()->create(['name' => 'Aqua', 'min_stock' => 10]);
    $ok = Product::factory()->create(['name' => 'Beras', 'min_stock' => 10]);

    $this->actingAs($this->admin);
    app(AdjustStock::class)
        ->handle($low, StockMovementType::Opening, $low->baseUnit, 5, $this->admin->id);
    app(AdjustStock::class)
        ->handle($ok, StockMovementType::Opening, $ok->baseUnit, 50, $this->admin->id);

    $this->get('/produk')->assertInertia(fn (Assert $page) => $page
        ->has('products.data', 2)
        ->where('products.data.0.name', 'Aqua')
        ->where('products.data.0.is_low', true)
        ->where('products.data.1.is_low', false));

    $this->get('/produk?menipis=1')->assertInertia(fn (Assert $page) => $page
        ->has('products.data', 1)
        ->where('products.data.0.name', 'Aqua'));

    $this->get('/produk?q=Beras')->assertInertia(fn (Assert $page) => $page
        ->has('products.data', 1)
        ->where('products.data.0.stock', 50));
});

test('kategori: tambah, ubah, hapus, dan tidak bisa dihapus bila dipakai', function () {
    $this->actingAs($this->admin)->post('/kategori', ['name' => 'Minuman'])->assertSessionHasNoErrors();
    $cat = Category::firstWhere('name', 'Minuman');

    $this->put("/kategori/{$cat->id}", ['name' => 'Minuman Dingin'])->assertSessionHasNoErrors();
    expect($cat->fresh()->name)->toBe('Minuman Dingin');

    $this->post('/kategori', ['name' => 'Minuman Dingin'])->assertSessionHasErrors('name');

    Product::factory()->create(['category_id' => $cat->id]);
    $this->delete("/kategori/{$cat->id}")->assertSessionHasErrors('name');
    expect(Category::count())->toBe(1);

    $empty = Category::factory()->create();
    $this->delete("/kategori/{$empty->id}");
    expect(Category::count())->toBe(1);
});

test('tanggal terima diisi dalam WIB, disimpan UTC, dan tampil kembali dalam WIB', function () {
    $this->travelTo(now()->setDate(2026, 11, 21)->setTime(5, 0)); // 12:00 WIB

    $product = Product::factory()->create();

    $this->actingAs($this->admin)->post('/penerimaan-barang', [
        'occurred_at' => '2026-11-21T10:00',
        'lines' => [['product_id' => $product->id, 'product_unit_id' => $product->baseUnit->id, 'qty' => 1]],
    ])->assertSessionHasNoErrors();

    $movement = StockMovement::firstOrFail();
    expect($movement->occurred_at->utc()->format('Y-m-d H:i'))->toBe('2026-11-21 03:00');

    $this->get("/produk/{$product->id}/kartu-stok")
        ->assertInertia(fn (Assert $page) => $page->where('movements.data.0.occurred_at', '21/11/2026 10:00'));
});

test('tanggal terima di masa depan ditolak', function () {
    $product = Product::factory()->create();

    $this->actingAs($this->admin)->post('/penerimaan-barang', [
        'occurred_at' => now()->addDays(2)->format('Y-m-d\TH:i'),
        'lines' => [['product_id' => $product->id, 'product_unit_id' => $product->baseUnit->id, 'qty' => 1]],
    ])->assertSessionHasErrors('occurred_at');
});
