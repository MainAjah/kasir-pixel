<?php

use App\Enums\Post;
use App\Enums\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Gate;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function penggunaPeran(string $role): User
{
    return User::factory()->create()->assignRole($role);
}

test('aturan pos: admin semua, kasir hanya Kasir, bendahara belum punya pos', function (string $role, array $boleh) {
    $user = penggunaPeran($role);

    foreach (Post::cases() as $post) {
        expect(Gate::forUser($user)->allows('open-post', $post))
            ->toBe(in_array($post->value, $boleh, true), "{$role} membuka {$post->value}");
    }
})->with([
    'admin' => ['admin', ['kasir', 'inventaris']],
    'kasir' => ['kasir', ['kasir']],
    'bendahara' => ['bendahara', []],
]);

test('admin membuka kedua pos dan menerima pilihan fiturnya', function () {
    $admin = penggunaPeran('admin');

    $this->actingAs($admin)
        ->getJson(route('dashboard.post', 'kasir'))
        ->assertOk()
        ->assertJson([
            'key' => 'kasir',
            'options' => [
                ['label' => 'Transaksi', 'href' => '/kasir'],
                ['label' => 'Riwayat transaksi', 'href' => '/kasir/penjualan'],
                ['label' => 'Laporan penjualan', 'href' => '/laporan/penjualan', 'note' => null],
                ['label' => 'Tambah produk', 'href' => '/produk/baru', 'note' => null],
            ],
        ]);

    $this->actingAs($admin)
        ->getJson(route('dashboard.post', 'inventaris'))
        ->assertOk()
        ->assertJson([
            'key' => 'inventaris',
            'options' => [
                ['label' => 'Stok barang', 'href' => '/produk'],
                ['label' => 'Barang masuk', 'href' => '/penerimaan-barang'],
                ['label' => 'Penyesuaian stok', 'href' => '/koreksi-stok'],
                ['label' => 'Supplier', 'href' => '/supplier'],
            ],
        ]);
});

test('kasir membuka pos Kasir, pos Inventaris ditolak di server dengan pesan singkat', function () {
    $kasir = penggunaPeran('kasir');

    // Tahap 6C: kasir melihat "Laporan penjualan" nonaktif "khusus admin".
    $this->actingAs($kasir)
        ->getJson(route('dashboard.post', 'kasir'))
        ->assertOk()
        ->assertJsonPath('options.0.href', '/kasir')
        ->assertJsonPath('options.2', ['label' => 'Laporan penjualan', 'href' => null, 'note' => 'khusus admin'])
        // Tahap 6D: "Tambah produk" juga nonaktif "khusus admin", dan rutenya 403 untuk kasir.
        ->assertJsonPath('options.3', ['label' => 'Tambah produk', 'href' => null, 'note' => 'khusus admin']);

    $this->actingAs($kasir)->get(route('products.create'))->assertForbidden();
    $this->actingAs($kasir)->post(route('products.store'), [])->assertForbidden();

    $this->actingAs($kasir)
        ->getJson(route('dashboard.post', 'inventaris'))
        ->assertForbidden()
        ->assertJsonPath('message', 'Pos Inventaris hanya untuk Admin.')
        ->assertJsonMissingPath('options');
});

test('bendahara ditolak di kedua pos', function () {
    $bendahara = penggunaPeran('bendahara');

    $this->actingAs($bendahara)
        ->getJson(route('dashboard.post', 'kasir'))
        ->assertForbidden()
        ->assertJsonPath('message', 'Pos Kasir hanya untuk Admin dan Kasir.');

    $this->actingAs($bendahara)
        ->getJson(route('dashboard.post', 'inventaris'))
        ->assertForbidden();
});

test('tamu ditolak dan pos yang tidak dikenal 404', function () {
    $this->getJson(route('dashboard.post', 'kasir'))->assertUnauthorized();

    $this->actingAs(penggunaPeran('admin'))
        ->getJson('/beranda/pos/koperasi')
        ->assertNotFound();
});

test('setiap pilihan aktif bisa dibuka oleh semua peran yang boleh membuka posnya', function () {
    foreach (Post::cases() as $post) {
        foreach ($post->roles() as $role) {
            $user = penggunaPeran($role->value);

            foreach ($post->options() as $option) {
                if ($option['route'] === null) {
                    continue;
                }

                // Pilihan khusus admin (6C): aktif untuk admin, 403 di server untuk peran lain.
                $adminOnly = ($option['admin_only'] ?? false) && $role !== Role::Admin;

                $this->actingAs($user)
                    ->get(route($option['route']))
                    ->assertStatus($adminOnly ? 403 : 200);
            }
        }
    }
});

test('halaman pos Inventaris tetap terkunci untuk kasir di server, bukan hanya disembunyikan', function () {
    $kasir = penggunaPeran('kasir');

    foreach (['stock-receipts.index', 'stock-adjustments.create'] as $route) {
        $this->actingAs($kasir)->get(route($route))->assertForbidden();
    }
});
