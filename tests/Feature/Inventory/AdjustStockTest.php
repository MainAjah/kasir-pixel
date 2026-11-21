<?php

use App\Actions\Inventory\AdjustStock;
use App\Enums\StockMovementType;
use App\Exceptions\StockException;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\SaleItem;
use App\Models\StockEntry;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\QueryException;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->product = Product::factory()->create(['name' => 'Mie Instan']);
    $this->pcs = $this->product->baseUnit;
    $this->dus = ProductUnit::factory()->for($this->product)->create(['name' => 'dus', 'conversion' => 24]);
    $this->action = app(AdjustStock::class);
    // Baris penjualan sungguhan: sale_item_id kini punya FK.
    $this->saleItem = SaleItem::factory()->create(['product_id' => $this->product->id, 'product_unit_id' => $this->pcs->id]);
});

function terima($t, int $qty, ?ProductUnit $unit = null): StockMovement
{
    $entry = StockEntry::create([
        'number' => 'BM-TES-'.uniqid(),
        'occurred_at' => now(),
        'created_by' => $t->user->id,
    ]);

    return $t->action->handle($t->product, StockMovementType::Receipt, $unit ?? $t->pcs, $qty, $t->user->id, entry: $entry);
}

test('saldo = jumlah qty = balance_after terakhir setelah campuran mutasi', function () {
    terima($this, 100);
    $this->action->handle($this->product, StockMovementType::Adjustment, $this->pcs, -30, $this->user->id, note: 'rusak');
    terima($this, 2, $this->dus);
    $this->action->handle($this->product, StockMovementType::Sale, $this->pcs, -10, $this->user->id, saleItemId: $this->saleItem->id);
    $this->action->handle($this->product, StockMovementType::Adjustment, $this->pcs, 5, $this->user->id, note: 'ketemu');

    $sum = (int) StockMovement::where('product_id', $this->product->id)->sum('qty');
    $last = StockMovement::where('product_id', $this->product->id)->orderByDesc('id')->value('balance_after');

    expect($sum)->toBe(100 - 30 + 48 - 10 + 5)
        ->and($last)->toBe($sum)
        ->and($this->product->currentStock())->toBe($sum)
        ->and(Product::withStock()->find($this->product->id)->stock)->toBe($sum);
});

test('rantai balance_after konsisten dari baris ke baris', function () {
    terima($this, 10);
    terima($this, 5);
    $this->action->handle($this->product, StockMovementType::Adjustment, $this->pcs, -7, $this->user->id, note: 'hilang');

    $running = 0;
    foreach (StockMovement::where('product_id', $this->product->id)->orderBy('id')->get() as $m) {
        $running += $m->qty;
        expect($m->balance_after)->toBe($running);
    }
});

test('menerima 2 dus berisi 24 menambah 48 satuan dasar', function () {
    $m = terima($this, 2, $this->dus);

    expect($m->qty)->toBe(48)
        ->and($m->input_qty)->toBe(2)
        ->and($m->input_unit_id)->toBe($this->dus->id)
        ->and($m->balance_after)->toBe(48);
});

test('mutasi yang membuat saldo minus ditolak untuk semua jenis', function () {
    terima($this, 5);

    expect(fn () => $this->action->handle($this->product, StockMovementType::Adjustment, $this->pcs, -6, $this->user->id, note: 'x'))
        ->toThrow(StockException::class, 'tidak cukup');
    expect(fn () => $this->action->handle($this->product, StockMovementType::Sale, $this->pcs, -6, $this->user->id, saleItemId: $this->saleItem->id))
        ->toThrow(StockException::class, 'tidak cukup');

    // 1 dus = 24 > 5: konversi ikut diperhitungkan.
    expect(fn () => $this->action->handle($this->product, StockMovementType::Adjustment, $this->dus, -1, $this->user->id, note: 'x'))
        ->toThrow(StockException::class);

    expect($this->product->currentStock())->toBe(5)
        ->and(StockMovement::count())->toBe(1);
});

test('produk tanpa mutasi bersaldo nol dan tidak bisa langsung keluar', function () {
    expect($this->product->currentStock())->toBe(0);

    expect(fn () => $this->action->handle($this->product, StockMovementType::Sale, $this->pcs, -1, $this->user->id, saleItemId: $this->saleItem->id))
        ->toThrow(StockException::class);
});

test('model ledger menolak update dan delete lewat Eloquent', function () {
    // Perlindungan hanya di tingkat model. Query builder langsung atau SQL manual
    // tidak dijaga (tidak ada trigger database di versi tugas), dan tidak diuji di sini.
    $m = terima($this, 5);

    expect(fn () => $m->update(['qty' => 99]))->toThrow(LogicException::class);
    expect(fn () => $m->delete())->toThrow(LogicException::class);

    expect(StockMovement::find($m->id)->qty)->toBe(5);
});

test('baris yang sama tidak bisa dibalik dua kali', function () {
    $m = terima($this, 10);

    $reversal = $this->action->reverse($m, $this->user->id, note: 'salah input');
    expect($reversal->qty)->toBe(-10)
        ->and($reversal->reverses_movement_id)->toBe($m->id)
        ->and($reversal->type)->toBe(StockMovementType::Adjustment)
        ->and($reversal->balance_after)->toBe(0);

    expect(fn () => $this->action->reverse($m, $this->user->id, note: 'lagi'))
        ->toThrow(StockException::class, 'sudah pernah dibalik');
});

test('baris pembalik tidak bisa dibalik lagi', function () {
    $m = terima($this, 10);
    $reversal = $this->action->reverse($m, $this->user->id, note: 'salah input');

    expect(fn () => $this->action->reverse($reversal, $this->user->id, note: 'balik lagi'))
        ->toThrow(StockException::class, 'tidak bisa dibalik');
});

test('membalik penerimaan yang stoknya sudah terjual ditolak', function () {
    $m = terima($this, 10);
    $this->action->handle($this->product, StockMovementType::Sale, $this->pcs, -8, $this->user->id, saleItemId: $this->saleItem->id);

    expect(fn () => $this->action->reverse($m, $this->user->id, note: 'batal'))
        ->toThrow(StockException::class, 'tidak cukup');
});

test('pembatalan penjualan memakai jenis sale_void dan membalik mutasi sale', function () {
    terima($this, 10);
    $sale = $this->action->handle($this->product, StockMovementType::Sale, $this->pcs, -4, $this->user->id, saleItemId: $this->saleItem->id);

    $void = $this->action->reverse($sale, $this->user->id);

    expect($void->type)->toBe(StockMovementType::SaleVoid)
        ->and($void->qty)->toBe(4)
        ->and($void->sale_item_id)->toBe($this->saleItem->id)
        ->and($void->balance_after)->toBe(10);
});

test('sale_void tidak bisa dibuat lewat handle()', function () {
    expect(fn () => $this->action->handle($this->product, StockMovementType::SaleVoid, $this->pcs, 1, $this->user->id, saleItemId: $this->saleItem->id))
        ->toThrow(StockException::class);
});

test('koreksi wajib disertai alasan', function () {
    terima($this, 5);

    expect(fn () => $this->action->handle($this->product, StockMovementType::Adjustment, $this->pcs, 1, $this->user->id))
        ->toThrow(StockException::class, 'alasan');
    expect(fn () => $this->action->handle($this->product, StockMovementType::Adjustment, $this->pcs, 1, $this->user->id, note: '   '))
        ->toThrow(StockException::class, 'alasan');
});

test('saldo awal hanya untuk produk yang belum punya mutasi', function () {
    $this->action->handle($this->product, StockMovementType::Opening, $this->pcs, 20, $this->user->id, costTotal: 15000);

    expect($this->product->currentStock())->toBe(20);

    expect(fn () => $this->action->handle($this->product, StockMovementType::Opening, $this->pcs, 5, $this->user->id))
        ->toThrow(StockException::class, 'Saldo awal');
});

test('tanda jumlah harus sesuai jenis mutasi', function () {
    expect(fn () => $this->action->handle($this->product, StockMovementType::Opening, $this->pcs, -1, $this->user->id))
        ->toThrow(StockException::class);
    expect(fn () => $this->action->handle($this->product, StockMovementType::Sale, $this->pcs, 1, $this->user->id, saleItemId: $this->saleItem->id))
        ->toThrow(StockException::class);
    expect(fn () => $this->action->handle($this->product, StockMovementType::Adjustment, $this->pcs, 0, $this->user->id, note: 'x'))
        ->toThrow(StockException::class, 'nol');
});

test('satuan milik produk lain ditolak', function () {
    $other = Product::factory()->create();

    expect(fn () => $this->action->handle($this->product, StockMovementType::Opening, $other->baseUnit, 1, $this->user->id))
        ->toThrow(StockException::class, 'Satuan tidak cocok');
});

test('penerimaan wajib punya dokumen penerimaan', function () {
    expect(fn () => $this->action->handle($this->product, StockMovementType::Receipt, $this->pcs, 1, $this->user->id))
        ->toThrow(StockException::class, 'dokumen');
});

test('database menolak qty nol (CHECK constraint)', function () {
    expect(fn () => StockMovement::create([
        'product_id' => $this->product->id,
        'type' => StockMovementType::Adjustment,
        'qty' => 0,
        'balance_after' => 0,
        'input_unit_id' => $this->pcs->id,
        'input_qty' => 0,
        'occurred_at' => now(),
        'created_by' => $this->user->id,
    ]))->toThrow(QueryException::class);
});

test('database menolak dua pembalik untuk baris yang sama (unique)', function () {
    $m = terima($this, 10);
    $row = fn () => StockMovement::create([
        'product_id' => $this->product->id,
        'type' => StockMovementType::Adjustment,
        'qty' => -1,
        'balance_after' => 9,
        'input_unit_id' => $this->pcs->id,
        'input_qty' => -1,
        'reverses_movement_id' => $m->id,
        'occurred_at' => now(),
        'created_by' => $this->user->id,
    ]);

    $row();
    expect($row)->toThrow(QueryException::class);
});
