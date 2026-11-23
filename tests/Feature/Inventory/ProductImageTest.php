<?php

use App\Models\ActivityLog;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

/** PNG sah 1 × 1 (tanpa butuh ekstensi GD untuk membuat gambar palsu). */
function pngKecil(string $nama = 'gambar.png'): UploadedFile
{
    return UploadedFile::fake()->createWithContent(
        $nama,
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
    );
}

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    Storage::fake('public');
    $this->admin = User::factory()->create()->assignRole('admin');
});

test('admin mengunggah gambar barang, berkas tersimpan dan tampil di form serta katalog kasir', function () {
    $teh = produkSiapJual(10, 5000, 'Teh Botol');

    $this->actingAs($this->admin)
        ->post("/produk/{$teh->id}/gambar", ['image' => pngKecil('teh.png')])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.edit', $teh));

    $path = $teh->fresh()->image_path;
    expect($path)->toStartWith('produk/'.$teh->id.'-')->toEndWith('.png');
    Storage::disk('public')->assertExists($path);
    expect(ActivityLog::where('action', 'product.image_set')->count())->toBe(1);

    $this->get("/produk/{$teh->id}/ubah")->assertInertia(fn (Assert $p) => $p
        ->where('product.image_url', '/storage/'.$path));

    [$kasir] = kasirDenganShift();
    $this->actingAs($kasir)->get('/kasir')->assertInertia(fn (Assert $p) => $p
        ->where('catalog.0.image_url', '/storage/'.$path));
});

test('mengganti gambar menghapus berkas lama, melepas gambar menghapus berkasnya', function () {
    $teh = produkSiapJual(10, 5000, 'Teh Botol');
    $this->actingAs($this->admin);

    $this->post("/produk/{$teh->id}/gambar", ['image' => pngKecil('a.png')]);
    $lama = $teh->fresh()->image_path;

    $this->post("/produk/{$teh->id}/gambar", ['image' => pngKecil('b.png')]);
    $baru = $teh->fresh()->image_path;

    expect($baru)->not->toBe($lama);
    Storage::disk('public')->assertMissing($lama);
    Storage::disk('public')->assertExists($baru);

    $this->delete("/produk/{$teh->id}/gambar")->assertRedirect(route('products.edit', $teh));

    expect($teh->fresh()->image_path)->toBeNull();
    Storage::disk('public')->assertMissing($baru);

    $this->get("/produk/{$teh->id}/ubah")->assertInertia(fn (Assert $p) => $p->where('product.image_url', null));
});

test('berkas yang bukan gambar atau terlalu besar ditolak', function () {
    $teh = produkSiapJual(10, 5000, 'Teh Botol');
    $this->actingAs($this->admin);

    $this->post("/produk/{$teh->id}/gambar", ['image' => UploadedFile::fake()->create('nota.pdf', 10, 'application/pdf')])
        ->assertSessionHasErrors('image');
    $this->post("/produk/{$teh->id}/gambar", ['image' => pngKecil('besar.png')->size(3000)])
        ->assertSessionHasErrors('image');
    $this->post("/produk/{$teh->id}/gambar", [])->assertSessionHasErrors('image');

    expect($teh->fresh()->image_path)->toBeNull();
});

test('kasir dan bendahara tidak boleh mengubah gambar barang', function (string $role) {
    $teh = produkSiapJual(10, 5000, 'Teh Botol');
    $user = User::factory()->create()->assignRole($role);

    $this->actingAs($user)
        ->post("/produk/{$teh->id}/gambar", ['image' => pngKecil('a.png')])
        ->assertForbidden();
    $this->delete("/produk/{$teh->id}/gambar")->assertForbidden();

    expect($teh->fresh()->image_path)->toBeNull();
})->with(['kasir', 'bendahara']);
