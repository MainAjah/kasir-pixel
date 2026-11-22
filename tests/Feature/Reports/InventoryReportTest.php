<?php

use App\Actions\Dashboard\TodaySummary;
use App\Actions\Inventory\AdjustStock;
use App\Actions\Inventory\ReceiveStock;
use App\Actions\Pos\CompleteSale;
use App\Actions\Pos\VoidSale;
use App\Actions\Reports\InventoryReport;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\CsvWriter;
use App\Support\ReportPeriod;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->admin = User::factory()->create()->assignRole('admin');
});

function produkInventaris(string $nama, int $stok, int $min, int $harga = 1000): Product
{
    $product = produkSiapJual($stok, $harga, $nama);
    $product->update(['min_stock' => $min]);

    return $product->refresh();
}

function baris(array $report, Product $product): array
{
    return collect($report['products'])->firstWhere('id', $product->id);
}

function inventaris(?ReportPeriod $period = null): array
{
    return app(InventoryReport::class)->handle($period ?? ReportPeriod::today());
}

test('stok = balance_after mutasi terakhir di ledger, sama dengan currentStock', function () {
    $mie = produkInventaris('Mi instan', 40, 10);
    [$kasir] = kasirDenganShift();
    app(CompleteSale::class)->handle($kasir, [['product_unit_id' => $mie->baseUnit->id, 'qty' => 7]], 7000);

    $row = baris(inventaris(), $mie);
    $latest = StockMovement::where('product_id', $mie->id)->orderByDesc('id')->value('balance_after');

    expect($row['stock'])->toBe(33)
        ->and($row['stock'])->toBe($latest)
        ->and($row['stock'])->toBe($mie->currentStock());
});

test('status aman, menipis, kosong di batasnya', function (int $stok, int $min, string $status) {
    $p = produkInventaris('Produk uji', $stok, $min);

    expect(baris(inventaris(), $p)['status'])->toBe($status);
})->with([
    'kosong' => [0, 10, 'kosong'],
    'satu' => [1, 10, 'menipis'],
    'tepat minimum' => [10, 10, 'menipis'],
    'di atas minimum' => [11, 10, 'aman'],
    'minimum 0, stok 0' => [0, 0, 'kosong'],
    'minimum 0, ada stok' => [3, 0, 'aman'],
]);

test('nilai stok = stok × harga jual satuan dasar, totalnya dijumlahkan', function () {
    produkInventaris('A', 10, 0, 3000);
    produkInventaris('B', 4, 0, 12500);
    produkInventaris('C', 0, 0, 9000);

    $report = inventaris();

    expect(collect($report['products'])->pluck('value', 'name')->all())->toBe(['A' => 30000, 'B' => 50000, 'C' => 0])
        ->and($report['summary']['value'])->toBe(80000);
});

test('stok menipis (termasuk kosong) sama dengan Product::lowStock dan kartu Beranda', function () {
    produkInventaris('Aman', 50, 10);
    produkInventaris('Menipis', 5, 10);
    produkInventaris('Kosong', 0, 10);
    produkInventaris('Nonaktif', 0, 10)->update(['is_active' => false]);

    $report = inventaris();

    expect($report['summary'])->toMatchArray(['products' => 3, 'aman' => 1, 'menipis' => 1, 'kosong' => 1, 'low' => 2])
        ->and($report['summary']['low'])->toBe(app(InventoryReport::class)->lowStockCount())
        ->and($report['summary']['low'])->toBe(app(TodaySummary::class)->handle()['low_stock'])
        ->and(collect($report['products'])->pluck('name'))->not->toContain('Nonaktif');
});

test('mutasi per jenis: masuk, keluar (penjualan bersih), penyesuaian', function () {
    $mie = produkInventaris('Mi instan', 20, 5); // saldo awal (opening) hari ini: masuk
    [$kasir] = kasirDenganShift();
    app(ReceiveStock::class)->handle($this->admin->id, [['product_id' => $mie->id, 'product_unit_id' => $mie->baseUnit->id, 'qty' => 6]]);
    app(CompleteSale::class)->handle($kasir, [['product_unit_id' => $mie->baseUnit->id, 'qty' => 4]], 4000);
    $batal = app(CompleteSale::class)->handle($kasir, [['product_unit_id' => $mie->baseUnit->id, 'qty' => 1]], 1000);
    app(VoidSale::class)->handle($batal, $this->admin, 'batal');
    app(AdjustStock::class)->handle($mie, StockMovementType::Adjustment, $mie->baseUnit, -2, $this->admin->id, note: 'rusak');

    $row = baris(inventaris(), $mie);

    expect($row)->toMatchArray([
        'opening' => 0,
        'in' => 26,     // 20 saldo awal + 6 penerimaan
        'out' => -4,    // -4 - 1 + 1 (pembatalan mengembalikan)
        'adjust' => -2,
        'closing' => 20,
        'stock' => 20,
    ]);
});

test('saldo awal dan akhir dari jumlah qty: tepat walau ada mutasi berwaktu sama dan Barang masuk bertanggal mundur', function () {
    $mie = produkInventaris('Mi instan', 0, 5);
    $unit = $mie->baseUnit;
    $adjust = app(AdjustStock::class);
    $sama = now()->subDays(10)->startOfHour();

    // Dua mutasi dengan occurred_at persis sama, sebelum periode.
    $adjust->handle($mie, StockMovementType::Opening, $unit, 10, $this->admin->id, occurredAt: $sama);
    $adjust->handle($mie, StockMovementType::Adjustment, $unit, 5, $this->admin->id, note: 'tambah', occurredAt: $sama);

    // Mutasi hari ini, lalu Barang masuk yang dicatat SESUDAHNYA tetapi bertanggal 3 hari lalu:
    // urutan id berbeda dengan urutan occurred_at.
    $adjust->handle($mie, StockMovementType::Adjustment, $unit, -4, $this->admin->id, note: 'rusak');
    app(ReceiveStock::class)->handle($this->admin->id, [['product_id' => $mie->id, 'product_unit_id' => $unit->id, 'qty' => 7]], occurredAt: now()->subDays(3));

    $row = baris(inventaris(ReportPeriod::make('7-hari')), $mie);
    $withStock = Product::withStock()->find($mie->id)->stock;
    $lastById = StockMovement::where('product_id', $mie->id)->orderByDesc('id')->value('balance_after');

    expect($row['opening'])->toBe(15)
        ->and($row['in'])->toBe(7)
        ->and($row['adjust'])->toBe(-4)
        ->and($row['opening'] + $row['in'] + $row['out'] + $row['adjust'])->toBe($row['closing'])
        ->and($row['closing'])->toBe(18)
        ->and($row['stock'])->toBe($withStock)
        ->and($withStock)->toBe($lastById)
        ->and($row['closing'])->toBe($withStock);
});

test('identitas saldo awal + mutasi = saldo akhir berlaku untuk semua produk dan periode', function () {
    $a = produkInventaris('A', 30, 5);
    $b = produkInventaris('B', 3, 5);
    [$kasir] = kasirDenganShift();
    app(CompleteSale::class)->handle($kasir, [['product_unit_id' => $a->baseUnit->id, 'qty' => 2]], 2000);

    foreach (['hari-ini', '7-hari', 'bulan-ini'] as $preset) {
        foreach (inventaris(ReportPeriod::make($preset))['products'] as $row) {
            expect($row['opening'] + $row['in'] + $row['out'] + $row['adjust'])->toBe($row['closing'], "{$row['name']} {$preset}");
        }
    }
});

// --- Halaman dan CSV -------------------------------------------------------------

test('admin membuka laporan inventaris', function () {
    produkInventaris('Mi instan', 5, 10);

    $this->actingAs($this->admin)
        ->get(route('reports.inventory', ['periode' => '7-hari']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('laporan/inventaris')
            ->where('filters.preset', '7-hari')
            ->where('report.summary.low', 1));
});

test('CSV inventaris: tajuk, satu baris per produk aktif, pengaman rumus pada teks', function () {
    $aneh = produkInventaris('=SUM(A1)', 4, 10, 2500);
    $aneh->update(['sku' => '+62-001']);
    produkInventaris('Mi instan', 0, 5);

    $csv = $this->actingAs($this->admin)->get(route('reports.inventory.csv'))->streamedContent();
    $rows = array_map(
        fn ($l) => str_getcsv($l, ';', '"', ''),
        array_values(array_filter(explode("\n", substr($csv, 3)))),
    );

    expect($rows[0])->toBe(InventoryReport::csvHeader())
        ->and($rows)->toHaveCount(3);

    $baris = collect($rows)->first(fn ($r) => $r[1] === "'=SUM(A1)");

    expect($baris)->not->toBeNull()
        ->and($baris[0])->toBe("'+62-001")
        ->and($baris[4])->toBe('4')
        ->and($baris[6])->toBe('menipis')
        ->and($baris[8])->toBe('10000');
});

test('pengaman rumus CSV: teks diawali = + - @ diberi petik, angka tetap angka', function () {
    expect(CsvWriter::cell('=SUM(A1)'))->toBe("'=SUM(A1)")
        ->and(CsvWriter::cell('+62812'))->toBe("'+62812")
        ->and(CsvWriter::cell('-diskon'))->toBe("'-diskon")
        ->and(CsvWriter::cell('@kasir'))->toBe("'@kasir")
        ->and(CsvWriter::cell('Mi instan'))->toBe('Mi instan')
        ->and(CsvWriter::cell(-5))->toBe('-5')
        ->and(CsvWriter::cell(0))->toBe('0')
        ->and(CsvWriter::cell(null))->toBe('');

    $csv = CsvWriter::toString(['Nama', 'Mutasi'], [['=1+1', -5]]);

    expect($csv)->toBe("\xEF\xBB\xBFNama;Mutasi\n'=1+1;-5\n");
});
