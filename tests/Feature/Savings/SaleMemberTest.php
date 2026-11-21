<?php

use App\Actions\Pos\CompleteSale;
use App\Actions\Savings\ExitMember;
use App\Exceptions\PosException;
use App\Models\Member;
use App\Models\Sale;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    [$this->kasir, $this->shift] = kasirDenganShift();
    $this->mie = produkSiapJual(20, 3000);
    $this->items = [['product_unit_id' => $this->mie->baseUnit->id, 'qty' => 2]];
    $this->sell = app(CompleteSale::class);
});

test('penjualan dengan anggota aktif menyimpan member_id', function () {
    $member = Member::factory()->create();

    $sale = $this->sell->handle($this->kasir, $this->items, 6000, $member->id);

    expect($sale->member_id)->toBe($member->id)
        ->and($sale->member->is($member))->toBeTrue()
        ->and($this->mie->currentStock())->toBe(18);
});

test('penjualan tanpa anggota tetap jalan', function () {
    $sale = $this->sell->handle($this->kasir, $this->items, 6000);

    expect($sale->member_id)->toBeNull();
});

test('anggota yang sudah keluar atau tidak ada menolak penjualan tanpa menyisakan data', function () {
    $keluar = Member::factory()->exited()->create();

    foreach ([$keluar->id, 999999] as $id) {
        expect(fn () => $this->sell->handle($this->kasir, $this->items, 6000, $id))
            ->toThrow(PosException::class, 'Anggota');
    }

    expect(Sale::count())->toBe(0)->and($this->mie->currentStock())->toBe(20);
});

test('anggota yang keluar lewat ExitMember tidak bisa dipilih lagi', function () {
    $member = Member::factory()->create();
    app(ExitMember::class)->handle($member, $this->kasir->id);

    expect(fn () => $this->sell->handle($this->kasir, $this->items, 6000, $member->id))
        ->toThrow(PosException::class);
});

test('pembayaran lewat HTTP dengan anggota, dan struk memuat anggota', function () {
    $member = Member::factory()->create(['name' => 'Siti Aminah']);

    $this->actingAs($this->kasir)->post('/kasir/penjualan', [
        'items' => $this->items, 'tendered' => 6000, 'member_id' => $member->id,
    ])->assertSessionHasNoErrors();

    $sale = Sale::firstOrFail();
    expect($sale->member_id)->toBe($member->id);

    $this->get("/kasir/penjualan/{$sale->id}/struk")->assertInertia(fn (Assert $p) => $p
        ->where('sale.member.name', 'Siti Aminah')
        ->where('sale.member.number', $member->member_number));
});

test('struk tanpa anggota berisi member null', function () {
    $this->actingAs($this->kasir)->post('/kasir/penjualan', ['items' => $this->items, 'tendered' => 6000]);

    $this->get('/kasir/penjualan/'.Sale::firstOrFail()->id.'/struk')
        ->assertInertia(fn (Assert $p) => $p->where('sale.member', null));
});

test('pembayaran lewat HTTP dengan anggota keluar ditolak dengan pesan', function () {
    $keluar = Member::factory()->exited()->create();

    $this->actingAs($this->kasir)->post('/kasir/penjualan', [
        'items' => $this->items, 'tendered' => 6000, 'member_id' => $keluar->id,
    ])->assertSessionHasErrors('cart');

    expect(Sale::count())->toBe(0);
});

// --- Pencarian anggota di layar kasir ---------------------------------------

test('pencarian anggota kasir: nomor atau nama, hanya aktif, hanya id nomor nama', function () {
    Member::factory()->create(['member_number' => 'A-000010', 'name' => 'Siti Aminah', 'phone' => '0811', 'address' => 'Rahasia']);
    Member::factory()->create(['member_number' => 'A-000011', 'name' => 'Budi Santoso']);
    Member::factory()->exited()->create(['member_number' => 'A-000012', 'name' => 'Siti Keluar']);

    $this->actingAs($this->kasir);

    $this->getJson('/kasir/anggota/cari?q=Siti')->assertOk()->assertJsonCount(1)
        ->assertJsonPath('0.name', 'Siti Aminah')
        ->assertJsonPath('0.number', 'A-000010');

    $this->getJson('/kasir/anggota/cari?q=A-000011')->assertJsonCount(1)->assertJsonPath('0.name', 'Budi Santoso');

    $hasil = $this->getJson('/kasir/anggota/cari?q=Siti')->json();
    expect(array_keys($hasil[0]))->toBe(['id', 'number', 'name']);

    $this->getJson('/kasir/anggota/cari?q=')->assertExactJson([]);
    $this->getJson('/kasir/anggota/cari?q=%25')->assertExactJson([]);
});

test('pencarian anggota dibatasi delapan hasil', function () {
    Member::factory()->count(12)->create(['name' => 'Andi Sama']);

    $this->actingAs($this->kasir)->getJson('/kasir/anggota/cari?q=Andi')->assertJsonCount(8);
});

test('pencarian anggota kasir hanya untuk kasir dan admin', function () {
    $bendahara = User::factory()->create()->assignRole('bendahara');

    $this->getJson('/kasir/anggota/cari?q=a')->assertUnauthorized();
    $this->actingAs($bendahara)->getJson('/kasir/anggota/cari?q=a')->assertForbidden();
    $this->actingAs(User::factory()->create()->assignRole('admin'))->getJson('/kasir/anggota/cari?q=a')->assertOk();
});
