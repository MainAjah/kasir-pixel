<?php

use App\Actions\Inventory\AdjustStock;
use App\Actions\Inventory\ReceiveStock;
use App\Actions\Inventory\SaveProduct;
use App\Enums\StockMovementType;
use App\Exceptions\StockException;
use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\StockEntry;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->save = app(SaveProduct::class);
    $this->payload = fn (array $override = []) => array_merge([
        'sku' => 'MIE-001',
        'name' => 'Mie Instan',
        'category_id' => null,
        'min_stock' => 10,
        'is_active' => true,
        'units' => [
            ['name' => 'pcs', 'conversion' => 1, 'sell_price' => 3000, 'barcode' => '8991111', 'is_base' => true],
            ['name' => 'dus', 'conversion' => 40, 'sell_price' => 110000, 'barcode' => '8992222', 'is_base' => false],
        ],
    ], $override);
});

test('membuat produk dengan dua satuan dan mencatat log', function () {
    $product = $this->save->handle(null, ($this->payload)(), $this->user->id);

    expect($product->units)->toHaveCount(2)
        ->and($product->baseUnit->name)->toBe('pcs')
        ->and(ActivityLog::where('action', 'product.created')->count())->toBe(1);
});

test('barcode dus menunjuk satuan dus', function () {
    $this->save->handle(null, ($this->payload)(), $this->user->id);

    $unit = ProductUnit::where('barcode', '8992222')->first();

    expect($unit->name)->toBe('dus')->and($unit->conversion)->toBe(40);
});

test('barcode ganda antar produk ditolak', function () {
    $this->save->handle(null, ($this->payload)(), $this->user->id);

    expect(fn () => $this->save->handle(null, ($this->payload)(['sku' => 'LAIN']), $this->user->id))
        ->toThrow(ValidationException::class);
    expect(Product::count())->toBe(1);
});

test('harus ada tepat satu satuan dasar berisi 1', function () {
    $noBase = ($this->payload)(['units' => [['name' => 'pcs', 'conversion' => 1, 'sell_price' => 1, 'is_base' => false]]]);
    $twoBase = ($this->payload)(['units' => [
        ['name' => 'pcs', 'conversion' => 1, 'sell_price' => 1, 'is_base' => true],
        ['name' => 'pak', 'conversion' => 1, 'sell_price' => 1, 'is_base' => true],
    ]]);
    $badBase = ($this->payload)(['units' => [['name' => 'dus', 'conversion' => 24, 'sell_price' => 1, 'is_base' => true]]]);

    foreach ([$noBase, $twoBase, $badBase] as $data) {
        expect(fn () => $this->save->handle(null, $data, $this->user->id))->toThrow(ValidationException::class);
    }
    expect(Product::count())->toBe(0);
});

test('perubahan harga dan isi satuan tercatat di activity_logs', function () {
    $product = $this->save->handle(null, ($this->payload)(), $this->user->id);
    $units = $product->units->keyBy('name');

    $data = ($this->payload)(['units' => [
        ['id' => $units['pcs']->id, 'name' => 'pcs', 'conversion' => 1, 'sell_price' => 3500, 'barcode' => '8991111', 'is_base' => true],
        ['id' => $units['dus']->id, 'name' => 'dus', 'conversion' => 48, 'sell_price' => 110000, 'barcode' => '8992222', 'is_base' => false],
    ]]);
    $this->save->handle($product, $data, $this->user->id);

    $price = ActivityLog::where('action', 'product.price_changed')->first();
    $conv = ActivityLog::where('action', 'product.unit_conversion_changed')->first();

    expect($price->properties)->toMatchArray(['unit' => 'pcs', 'old' => 3000, 'new' => 3500])
        ->and($conv->properties)->toMatchArray(['unit' => 'dus', 'old' => 40, 'new' => 48])
        ->and($price->user_id)->toBe($this->user->id);
});

test('conversion satuan yang sudah dipakai tidak bisa diubah', function () {
    $product = $this->save->handle(null, ($this->payload)(), $this->user->id);
    $units = $product->units->keyBy('name');

    app(ReceiveStock::class)->handle($this->user->id, [
        ['product_id' => $product->id, 'product_unit_id' => $units['dus']->id, 'qty' => 2],
    ]);

    $data = ($this->payload)(['units' => [
        ['id' => $units['pcs']->id, 'name' => 'pcs', 'conversion' => 1, 'sell_price' => 3000, 'barcode' => '8991111', 'is_base' => true],
        ['id' => $units['dus']->id, 'name' => 'dus', 'conversion' => 12, 'sell_price' => 110000, 'barcode' => '8992222', 'is_base' => false],
    ]]);

    expect(fn () => $this->save->handle($product, $data, $this->user->id))
        ->toThrow(ValidationException::class);
    expect($units['dus']->fresh()->conversion)->toBe(40);
});

test('satuan terpakai tidak bisa dihapus, satuan belum terpakai bisa dan melepas barcode', function () {
    $product = $this->save->handle(null, ($this->payload)(), $this->user->id);
    $units = $product->units->keyBy('name');

    // Hanya pcs yang dikirim: dus belum dipakai, jadi terhapus dan barcodenya lepas.
    $onlyPcs = ($this->payload)(['units' => [
        ['id' => $units['pcs']->id, 'name' => 'pcs', 'conversion' => 1, 'sell_price' => 3000, 'barcode' => '8991111', 'is_base' => true],
    ]]);
    $this->save->handle($product, $onlyPcs, $this->user->id);

    expect($product->units()->count())->toBe(1)
        ->and(ProductUnit::withTrashed()->find($units['dus']->id)->barcode)->toBeNull();

    // Barcode dan nama dus bisa dipakai lagi.
    $product = $this->save->handle($product, ($this->payload)(['units' => [
        ['id' => $units['pcs']->id, 'name' => 'pcs', 'conversion' => 1, 'sell_price' => 3000, 'barcode' => '8991111', 'is_base' => true],
        ['name' => 'dus', 'conversion' => 40, 'sell_price' => 110000, 'barcode' => '8992222', 'is_base' => false],
    ]]), $this->user->id);
    expect($product->units)->toHaveCount(2);

    // Setelah dus dipakai di mutasi, tidak boleh dihapus.
    $dus = $product->units->firstWhere('name', 'dus');
    app(ReceiveStock::class)->handle($this->user->id, [
        ['product_id' => $product->id, 'product_unit_id' => $dus->id, 'qty' => 1],
    ]);

    expect(fn () => $this->save->handle($product, $onlyPcs, $this->user->id))
        ->toThrow(ValidationException::class);
});

test('satuan dasar tidak bisa diganti setelah produk punya mutasi', function () {
    $product = $this->save->handle(null, ($this->payload)(), $this->user->id);
    $units = $product->units->keyBy('name');

    app(AdjustStock::class)->handle($product, StockMovementType::Opening, $units['pcs'], 10, $this->user->id);

    $swapped = ($this->payload)(['units' => [
        ['id' => $units['pcs']->id, 'name' => 'pcs', 'conversion' => 1, 'sell_price' => 3000, 'barcode' => '8991111', 'is_base' => false],
        ['id' => $units['dus']->id, 'name' => 'dus', 'conversion' => 1, 'sell_price' => 110000, 'barcode' => '8992222', 'is_base' => true],
    ]]);

    expect(fn () => $this->save->handle($product, $swapped, $this->user->id))
        ->toThrow(ValidationException::class);
    expect($units['pcs']->fresh()->is_base)->toBeTrue();
});

test('penerimaan barang membuat dokumen bernomor dan mutasi yang cocok', function () {
    $a = Product::factory()->create();
    $b = Product::factory()->create();

    $entry = app(ReceiveStock::class)->handle($this->user->id, [
        ['product_id' => $a->id, 'product_unit_id' => $a->baseUnit->id, 'qty' => 12, 'cost_total' => 24000],
        ['product_id' => $b->id, 'product_unit_id' => $b->baseUnit->id, 'qty' => 5],
    ], supplierName: 'CV Maju', note: 'Faktur 123');

    expect($entry->number)->toBe('BM-'.now()->timezone(config('app.display_timezone'))->format('Ymd').'-0001')
        ->and($entry->movements)->toHaveCount(2)
        ->and($a->currentStock())->toBe(12)
        ->and($b->currentStock())->toBe(5)
        ->and($entry->movements->firstWhere('product_id', $a->id)->cost_total)->toBe(24000)
        ->and(ActivityLog::where('action', 'stock.received')->count())->toBe(1);

    $second = app(ReceiveStock::class)->handle($this->user->id, [
        ['product_id' => $a->id, 'product_unit_id' => $a->baseUnit->id, 'qty' => 1],
    ]);

    expect($second->number)->toEndWith('-0002');
});

test('penerimaan barang gagal seluruhnya bila satu baris bermasalah', function () {
    $a = Product::factory()->create();
    $other = Product::factory()->create();

    expect(fn () => app(ReceiveStock::class)->handle($this->user->id, [
        ['product_id' => $a->id, 'product_unit_id' => $a->baseUnit->id, 'qty' => 5],
        ['product_id' => $a->id, 'product_unit_id' => $other->baseUnit->id, 'qty' => 5],
    ]))->toThrow(StockException::class);

    expect(StockEntry::count())->toBe(0)
        ->and(StockMovement::count())->toBe(0)
        ->and($a->currentStock())->toBe(0);
});

test('penerimaan tanpa baris ditolak', function () {
    expect(fn () => app(ReceiveStock::class)->handle($this->user->id, []))
        ->toThrow(StockException::class);
});
