<?php

namespace Database\Seeders;

use App\Actions\Inventory\AdjustStock;
use App\Actions\Inventory\SaveProduct;
use App\Actions\Inventory\SetProductImage;
use App\Actions\Pos\OpenShift;
use App\Actions\Savings\CreateMember;
use App\Actions\Savings\PostSaving;
use App\Enums\SavingsType;
use App\Enums\StockMovementType;
use App\Models\CashShift;
use App\Models\Category;
use App\Models\Member;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Http\File;
use RuntimeException;

/**
 * Data contoh untuk demo (Tahap 6): kategori, empat produk bergambar beserta satuan dan
 * barcode (dikurangi atas permintaan pemilik; barang lain ditambah sendiri lewat aplikasi),
 * stok awal dengan campuran kosong, sedikit, setengah, dan penuh, beberapa anggota dengan
 * simpanan, dan satu shift demo untuk kasir contoh. Gambar barang diambil dari
 * database/seeders/gambar-produk/{SKU}.png.
 *
 * Hanya untuk lingkungan lokal: di lingkungan lain seeder ini tidak melakukan apa-apa,
 * jadi database tes dan produksi tidak pernah tersentuh. Semua tulisan lewat Action yang
 * sudah ada (SaveProduct, AdjustStock, CreateMember, PostSaving, OpenShift), jadi ledger
 * tetap konsisten dan stok tidak pernah minus. Aman dijalankan ulang: produk yang SKU-nya
 * sudah ada dan anggota yang namanya sudah ada dilewati.
 */
class DemoDataSeeder extends Seeder
{
    /** Stok minimum semua produk contoh; tingkat isi di bawah dihitung terhadap angka ini. */
    public const MIN_STOCK = 10;

    /** Stok awal (satuan dasar) tiap tingkat isi. */
    public const LEVELS = ['kosong' => 0, 'sedikit' => 6, 'setengah' => 25, 'penuh' => 60];

    /** Kas awal shift demo. */
    public const OPENING_CASH = 200000;

    /**
     * Produk contoh: sku, nama, kategori, satuan dasar, harga satuan dasar, tingkat isi,
     * satuan lain (nama, isi, harga) atau null.
     *
     * @var array<int, array{string, string, string, string, int, string, array{string, int, int}|null}>
     */
    private const PRODUCTS = [
        ['DM-101', 'Air mineral 600 ml', 'Minuman', 'botol', 3500, 'penuh', ['dus', 24, 80000]],
        ['DM-201', 'Biskuit kelapa', 'Makanan ringan', 'bungkus', 9000, 'setengah', null],
        ['DM-202', 'Keripik singkong', 'Makanan ringan', 'bungkus', 8500, 'sedikit', null],
        ['DM-203', 'Cokelat batang', 'Makanan ringan', 'batang', 12000, 'kosong', null],
    ];

    /** Anggota contoh: nama, simpanan wajib (jumlah bulan terakhir), setoran sukarela. */
    private const MEMBERS = [
        ['Siti Rahmawati', 2, 50000],
        ['Budi Santoso', 1, 0],
        ['Dewi Lestari', 3, 150000],
        ['Agus Prasetyo', 0, 0],
        ['Rina Wulandari', 1, 25000],
    ];

    public function run(): void
    {
        if (! app()->environment('local')) {
            $this->command?->warn('DemoDataSeeder dilewati: hanya untuk lingkungan lokal.');

            return;
        }

        $admin = User::where('email', 'admin@kasir.test')->first();
        $kasir = User::where('email', 'kasir@kasir.test')->first();

        if ($admin === null || $kasir === null) {
            throw new RuntimeException('Akun demo admin dan kasir belum ada. Jalankan DatabaseSeeder lebih dulu.');
        }

        $this->seedProducts($admin);
        $this->seedMembers($admin);
        $this->seedDemoShift($kasir);
    }

    private function seedProducts(User $admin): void
    {
        $save = app(SaveProduct::class);
        $adjust = app(AdjustStock::class);
        $categories = [];

        foreach (self::PRODUCTS as $i => [$sku, $name, $category, $unit, $price, $level, $extra]) {
            if ($existing = Product::withTrashed()->where('sku', $sku)->first()) {
                $this->attachImage($existing, $admin);

                continue;
            }

            $categories[$category] ??= Category::firstOrCreate(['name' => $category])->id;

            $units = [[
                'name' => $unit,
                'conversion' => 1,
                'sell_price' => $price,
                'barcode' => $this->barcode($i, 1),
                'is_base' => true,
            ]];

            if ($extra !== null) {
                $units[] = [
                    'name' => $extra[0],
                    'conversion' => $extra[1],
                    'sell_price' => $extra[2],
                    'barcode' => $this->barcode($i, 2),
                    'is_base' => false,
                ];
            }

            $product = $save->handle(null, [
                'sku' => $sku,
                'name' => $name,
                'category_id' => $categories[$category],
                'min_stock' => self::MIN_STOCK,
                'units' => $units,
            ], $admin->id);

            $qty = self::LEVELS[$level];

            // Tingkat "kosong" = belum ada mutasi sama sekali (stok 0).
            if ($qty > 0) {
                $adjust->handle($product, StockMovementType::Opening, $product->baseUnit, $qty, $admin->id);
            }

            $this->attachImage($product, $admin);
        }
    }

    /** Gambar barang contoh (bila ada berkasnya dan produk belum bergambar). */
    private function attachImage(Product $product, User $admin): void
    {
        $file = database_path("seeders/gambar-produk/{$product->sku}.png");

        if ($product->image_path === null && is_file($file)) {
            app(SetProductImage::class)->handle($product, new File($file), $admin->id);
        }
    }

    private function seedMembers(User $admin): void
    {
        $create = app(CreateMember::class);
        $post = app(PostSaving::class);
        $tz = config('app.display_timezone');
        $pokok = (int) config('koperasi.savings.pokok');
        $wajib = (int) config('koperasi.savings.wajib');

        foreach (self::MEMBERS as [$name, $months, $voluntary]) {
            if (Member::where('name', $name)->exists()) {
                continue;
            }

            // Bergabung awal bulan lalu atau lebih awal, supaya simpanan wajib bulan-bulan lalu sah.
            $joined = now($tz)->subMonths(max($months, 1))->startOfMonth()->toDateString();
            $member = $create->handle(['name' => $name, 'joined_at' => $joined, 'phone' => '0812'.random_int(10000000, 99999999)], $admin->id);

            $post->deposit($member, SavingsType::Pokok, $pokok, $admin->id);

            for ($m = 0; $m < $months; $m++) {
                $post->deposit($member, SavingsType::Wajib, $wajib, $admin->id, now($tz)->subMonths($m)->startOfMonth());
            }

            if ($voluntary > 0) {
                $post->deposit($member, SavingsType::Sukarela, $voluntary, $admin->id);
            }
        }
    }

    private function seedDemoShift(User $kasir): void
    {
        if (CashShift::activeFor($kasir) === null) {
            app(OpenShift::class)->handle($kasir, self::OPENING_CASH);
        }
    }

    /** Barcode contoh 13 digit yang stabil: 899 + nomor produk + nomor satuan. */
    private function barcode(int $index, int $unit): string
    {
        return '899'.str_pad((string) (100000 + $index * 10 + $unit), 10, '0', STR_PAD_LEFT);
    }
}
