<?php

use App\Actions\Inventory\ReceiveStock;
use App\Models\ProductUnit;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

/* Tahap 5E-2: detail penerimaan barang (hanya membaca). */

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->admin = User::factory()->create()->assignRole('admin');
});

test('detail penerimaan menampilkan supplier, tanggal, dan daftar barang', function () {
    $supplier = Supplier::factory()->create(['name' => 'CV Sumber Rejeki', 'contact' => '0812', 'address' => 'Jl. Pasar']);
    $mie = produkSiapJual(0, 3000, 'Mie Instan');
    $dus = ProductUnit::factory()->for($mie)->create(['name' => 'dus', 'conversion' => 40, 'sell_price' => 120000]);
    $teh = produkSiapJual(0, 5000, 'Teh Botol');

    $entry = app(ReceiveStock::class)->handle($this->admin->id, [
        ['product_id' => $mie->id, 'product_unit_id' => $dus->id, 'qty' => 2, 'cost_total' => 200000],
        ['product_id' => $teh->id, 'product_unit_id' => $teh->baseUnit->id, 'qty' => 12],
    ], note: 'kiriman pagi', supplierId: $supplier->id);

    $this->actingAs($this->admin)->get(route('stock-receipts.show', $entry))
        ->assertOk()
        ->assertInertia(fn (Assert $p) => $p
            ->component('inventaris/penerimaan/show')
            ->where('entry.number', $entry->number)
            ->where('entry.supplier.name', 'CV Sumber Rejeki')
            ->where('entry.supplier.contact', '0812')
            ->where('entry.note', 'kiriman pagi')
            ->has('entry.lines', 2)
            ->where('entry.lines.0.product', 'Mie Instan')
            ->where('entry.lines.0.input_qty', 2)
            ->where('entry.lines.0.input_unit', 'dus')
            ->where('entry.lines.0.qty', 80)
            ->where('entry.lines.0.cost_total', 200000)
            ->where('entry.lines.1.product', 'Teh Botol')
            ->where('entry.lines.1.qty', 12)
            ->where('entry.lines.1.cost_total', null)
            ->where('entry.total_cost', 200000)
            ->where('entry.has_missing_cost', true));
});

test('detail penerimaan khusus admin', function (string $role) {
    $teh = produkSiapJual(0, 5000, 'Teh Botol');
    $entry = app(ReceiveStock::class)->handle($this->admin->id, [
        ['product_id' => $teh->id, 'product_unit_id' => $teh->baseUnit->id, 'qty' => 1],
    ], 'Toko');

    $this->actingAs(User::factory()->create()->assignRole($role))
        ->get(route('stock-receipts.show', $entry))
        ->assertForbidden();
})->with(['kasir', 'bendahara']);
