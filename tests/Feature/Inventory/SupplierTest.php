<?php

use App\Actions\Inventory\ReceiveStock;
use App\Enums\StockMovementType;
use App\Exceptions\StockException;
use App\Models\ActivityLog;
use App\Models\StockEntry;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->admin = User::factory()->create()->assignRole('admin');
});

function dataSupplier(array $over = []): array
{
    return array_merge([
        'name' => 'CV Sumber Rejeki',
        'contact' => '0812 3456 7890',
        'address' => 'Jl. Pasar 1',
        'note' => 'Kirim tiap Senin',
    ], $over);
}

// --- Akses ----------------------------------------------------------------------

test('hanya admin yang bisa membuka dan mengubah supplier', function (string $role) {
    $user = User::factory()->create()->assignRole($role);
    $supplier = Supplier::factory()->create();

    $this->actingAs($user);
    $this->get(route('suppliers.index'))->assertForbidden();
    $this->get(route('suppliers.create'))->assertForbidden();
    $this->post(route('suppliers.store'), dataSupplier())->assertForbidden();
    $this->get(route('suppliers.edit', $supplier))->assertForbidden();
    $this->put(route('suppliers.update', $supplier), dataSupplier())->assertForbidden();
    $this->post(route('suppliers.deactivate', $supplier))->assertForbidden();

    expect(Supplier::count())->toBe(1)
        ->and($supplier->fresh()->is_active)->toBeTrue();
})->with(['kasir', 'bendahara']);

// --- Tambah, ubah, nonaktifkan --------------------------------------------------

test('admin menambah, mengubah, menonaktifkan, dan mengaktifkan supplier', function () {
    $this->actingAs($this->admin)->post(route('suppliers.store'), dataSupplier())->assertRedirect(route('suppliers.index'));
    $supplier = Supplier::firstOrFail();

    expect($supplier->contact)->toBe('0812 3456 7890')
        ->and($supplier->created_by)->toBe($this->admin->id);

    $this->actingAs($this->admin)
        ->put(route('suppliers.update', $supplier), dataSupplier(['name' => 'CV Sumber Baru']))
        ->assertRedirect(route('suppliers.index'));
    expect($supplier->fresh()->name)->toBe('CV Sumber Baru');

    $this->actingAs($this->admin)->post(route('suppliers.deactivate', $supplier));
    expect($supplier->fresh()->is_active)->toBeFalse()
        ->and(Supplier::withTrashed()->find($supplier->id)->trashed())->toBeFalse();

    $this->actingAs($this->admin)->post(route('suppliers.activate', $supplier));
    expect($supplier->fresh()->is_active)->toBeTrue();

    expect(ActivityLog::where('action', 'like', 'supplier.%')->count())->toBe(4);
});

test('nama supplier wajib', function () {
    $this->actingAs($this->admin)
        ->post(route('suppliers.store'), dataSupplier(['name' => '']))
        ->assertSessionHasErrors('name');
});

test('daftar supplier menampilkan jumlah penerimaannya', function () {
    $supplier = Supplier::factory()->create();
    $mie = produkSiapJual(0);
    app(ReceiveStock::class)->handle($this->admin->id, [
        ['product_id' => $mie->id, 'product_unit_id' => $mie->baseUnit->id, 'qty' => 5],
    ], supplierId: $supplier->id);

    $this->actingAs($this->admin)
        ->get(route('suppliers.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('inventaris/supplier/index')
            ->where('suppliers.data.0.entries', 1));
});

// --- Terhubung ke Barang masuk --------------------------------------------------

test('form Barang masuk hanya menawarkan supplier aktif', function () {
    Supplier::factory()->create(['name' => 'Aktif']);
    Supplier::factory()->inactive()->create(['name' => 'Nonaktif']);

    $this->actingAs($this->admin)
        ->get(route('stock-receipts.create'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('suppliers', 1)
            ->where('suppliers.0.name', 'Aktif'));
});

test('Barang masuk dengan supplier menyimpan supplier dan namanya, stok lewat ledger', function () {
    $supplier = Supplier::factory()->create(['name' => 'CV Maju']);
    $mie = produkSiapJual(10);

    $this->actingAs($this->admin)
        ->post(route('stock-receipts.store'), [
            'supplier_id' => $supplier->id,
            'supplier_name' => 'teks ini diabaikan',
            'lines' => [['product_id' => $mie->id, 'product_unit_id' => $mie->baseUnit->id, 'qty' => 7]],
        ])
        ->assertRedirect(route('stock-receipts.index'));

    $entry = StockEntry::latest('id')->firstOrFail();
    $movement = StockMovement::where('stock_entry_id', $entry->id)->firstOrFail();

    expect($entry->supplier_id)->toBe($supplier->id)
        ->and($entry->supplier_name)->toBe('CV Maju')
        ->and($entry->supplier->name)->toBe('CV Maju')
        ->and($movement->type)->toBe(StockMovementType::Receipt)
        ->and($movement->qty)->toBe(7)
        ->and($movement->balance_after)->toBe(17)
        ->and($mie->currentStock())->toBe(17);
});

test('Barang masuk tanpa supplier tetap bisa memakai nama pemasok teks bebas', function () {
    $mie = produkSiapJual(0);

    $this->actingAs($this->admin)->post(route('stock-receipts.store'), [
        'supplier_name' => 'Toko Pak Budi',
        'lines' => [['product_id' => $mie->id, 'product_unit_id' => $mie->baseUnit->id, 'qty' => 3]],
    ])->assertRedirect(route('stock-receipts.index'));

    $entry = StockEntry::latest('id')->firstOrFail();

    expect($entry->supplier_id)->toBeNull()
        ->and($entry->supplier_name)->toBe('Toko Pak Budi')
        ->and($mie->currentStock())->toBe(3);
});

test('supplier nonaktif ditolak dan tidak ada stok yang tercatat', function () {
    $supplier = Supplier::factory()->inactive()->create();
    $mie = produkSiapJual(4);
    $before = StockMovement::count();

    $this->actingAs($this->admin)->post(route('stock-receipts.store'), [
        'supplier_id' => $supplier->id,
        'lines' => [['product_id' => $mie->id, 'product_unit_id' => $mie->baseUnit->id, 'qty' => 3]],
    ])->assertSessionHasErrors('supplier_id');

    expect(StockMovement::count())->toBe($before)
        ->and($mie->currentStock())->toBe(4);

    // Lewat Action pun ditolak.
    expect(fn () => app(ReceiveStock::class)->handle($this->admin->id, [
        ['product_id' => $mie->id, 'product_unit_id' => $mie->baseUnit->id, 'qty' => 3],
    ], supplierId: $supplier->id))->toThrow(StockException::class, 'Supplier tidak ditemukan atau sudah dinonaktifkan.');

    expect($mie->currentStock())->toBe(4);
});

test('ledger sama persis dengan atau tanpa supplier', function () {
    $a = produkSiapJual(0, 1000, 'Produk A');
    $b = produkSiapJual(0, 1000, 'Produk B');
    $supplier = Supplier::factory()->create();

    app(ReceiveStock::class)->handle($this->admin->id, [
        ['product_id' => $a->id, 'product_unit_id' => $a->baseUnit->id, 'qty' => 9],
    ], supplierId: $supplier->id);
    app(ReceiveStock::class)->handle($this->admin->id, [
        ['product_id' => $b->id, 'product_unit_id' => $b->baseUnit->id, 'qty' => 9],
    ]);

    $ma = StockMovement::where('product_id', $a->id)->firstOrFail();
    $mb = StockMovement::where('product_id', $b->id)->firstOrFail();

    expect([$ma->type, $ma->qty, $ma->balance_after])->toBe([$mb->type, $mb->qty, $mb->balance_after]);
});

test('pilihan Supplier di pos Inventaris kini tertaut ke halaman supplier', function () {
    $this->actingAs($this->admin)
        ->getJson(route('dashboard.post', 'inventaris'))
        ->assertJsonPath('options.3', ['label' => 'Supplier', 'href' => '/supplier', 'note' => null]);
});
