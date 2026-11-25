<?php

use App\Actions\Dashboard\TodaySummary;
use App\Actions\Pos\CompleteSale;
use App\Actions\Pos\VoidSale;
use App\Actions\Reports\InventoryReport;
use App\Actions\Reports\SalesReport;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Support\ReportPeriod;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->admin = User::factory()->create()->assignRole('admin');
    [$this->kasir] = kasirDenganShift();
    $this->mie = produkSiapJual(500, 3000, 'Mi instan');
    $this->teh = produkSiapJual(500, 5000, 'Teh botol');
});

/** @param  list<array{0: Product, 1: int}>  $lines */
function jualLaporan(User $kasir, array $lines): Sale
{
    $items = array_map(fn ($l) => ['product_unit_id' => $l[0]->baseUnit->id, 'qty' => $l[1]], $lines);
    $total = array_sum(array_map(fn ($l) => $l[0]->baseUnit->sell_price * $l[1], $lines));

    return app(CompleteSale::class)->handle($kasir, $items, $total);
}

function laporan(ReportPeriod $period, ?int $cashierId = null): array
{
    return app(SalesReport::class)->handle($period, $cashierId);
}

// --- Angka cocok dengan data ---------------------------------------------------

test('total laporan cocok dengan data penjualan: tanpa yang dibatalkan dan tanpa yang di luar periode', function () {
    $this->travelTo(now()->subDays(3));
    jualLaporan($this->kasir, [[$this->mie, 10]]); // di luar "hari ini"
    $this->travelBack();

    jualLaporan($this->kasir, [[$this->mie, 2]]); // 6.000
    jualLaporan($this->kasir, [[$this->teh, 1]]); // 5.000
    $batal = jualLaporan($this->kasir, [[$this->mie, 3]]); // 9.000, dibatalkan
    app(VoidSale::class)->handle($batal, $this->admin, 'salah input');

    // Dihitung langsung dari tabel, terpisah dari kode laporan.
    $tz = config('app.display_timezone');
    $from = now($tz)->startOfDay()->utc();
    $until = now($tz)->endOfDay()->utc();
    $expected = DB::table('sales')
        ->whereBetween('created_at', [$from, $until])
        ->whereNotExists(fn ($q) => $q->from('sale_voids')->whereColumn('sale_voids.sale_id', 'sales.id'))
        ->selectRaw('COALESCE(SUM(total), 0) AS total, COUNT(*) AS count')
        ->first();

    $report = laporan(ReportPeriod::today());

    expect($report['summary']['total'])->toBe((int) $expected->total)
        ->and($report['summary']['count'])->toBe((int) $expected->count)
        ->and($report['summary'])->toBe(['total' => 11000, 'count' => 2, 'average' => 5500]);

    // Pembatalan terpisah dan tidak ikut dihitung.
    expect($report['voided']['count'])->toBe(1)
        ->and($report['voided']['total'])->toBe(9000)
        ->and($report['voided']['rows'][0]['number'])->toBe($batal->number)
        ->and($report['voided']['rows'][0]['reason'])->toBe('salah input');
});

test('rata-rata per transaksi dibulatkan ke rupiah terdekat', function () {
    jualLaporan($this->kasir, [[$this->mie, 1]]); // 3.000
    jualLaporan($this->kasir, [[$this->teh, 1]]); // 5.000
    jualLaporan($this->kasir, [[$this->mie, 2]]); // 6.000

    // 14.000 / 3 = 4.666,67
    expect(laporan(ReportPeriod::today())['summary']['average'])->toBe(4667);
});

test('tanpa penjualan: semua nol, rata-rata nol', function () {
    expect(laporan(ReportPeriod::today())['summary'])->toBe(['total' => 0, 'count' => 0, 'average' => 0]);
});

test('per hari dan per kasir menjumlah ke total; hari tanpa penjualan tetap tampil', function () {
    [$kasir2] = kasirDenganShift(role: 'kasir');

    $this->travelTo(now()->subDays(2));
    jualLaporan($this->kasir, [[$this->mie, 1]]);
    $this->travelBack();
    jualLaporan($this->kasir, [[$this->teh, 2]]);
    jualLaporan($kasir2, [[$this->mie, 4]]);
    $batal = jualLaporan($kasir2, [[$this->teh, 5]]);
    app(VoidSale::class)->handle($batal, $this->admin, 'batal');

    $report = laporan(ReportPeriod::make('7-hari'));
    $total = $report['summary']['total'];

    expect($report['daily'])->toHaveCount(7)
        ->and(array_sum(array_column($report['daily'], 'total')))->toBe($total)
        ->and(array_sum(array_column($report['daily'], 'count')))->toBe($report['summary']['count'])
        ->and(array_sum(array_column($report['cashiers'], 'total')))->toBe($total)
        ->and($total)->toBe(3000 + 10000 + 12000)
        ->and(collect($report['daily'])->where('total', 0)->count())->toBe(5);
});

test('produk terlaris menurut jumlah terjual dalam satuan dasar, tanpa penjualan batal', function () {
    jualLaporan($this->kasir, [[$this->mie, 5], [$this->teh, 1]]);
    jualLaporan($this->kasir, [[$this->teh, 1]]);
    $batal = jualLaporan($this->kasir, [[$this->teh, 10]]);
    app(VoidSale::class)->handle($batal, $this->admin, 'batal');

    $top = laporan(ReportPeriod::today())['top_products'];

    expect($top[0])->toMatchArray(['name' => 'Mi instan', 'qty' => 5, 'revenue' => 15000, 'sales' => 1])
        ->and($top[1])->toMatchArray(['name' => 'Teh botol', 'qty' => 2, 'revenue' => 10000, 'sales' => 2]);
});

test('filter kasir hanya menghitung penjualan kasir itu', function () {
    [$kasir2] = kasirDenganShift(role: 'kasir');
    jualLaporan($this->kasir, [[$this->mie, 1]]);
    jualLaporan($kasir2, [[$this->teh, 1]]);

    $report = laporan(ReportPeriod::today(), $kasir2->id);

    expect($report['summary']['total'])->toBe(5000)
        ->and($report['cashiers'])->toHaveCount(1)
        ->and($report['cashiers'][0]['user_id'])->toBe($kasir2->id);
});

test('batas hari mengikuti zona tampilan: 00.30 WIB masuk tanggal baru', function () {
    config(['app.display_timezone' => 'Asia/Jakarta']);

    $this->travelTo(Carbon::parse('2026-11-22 23:50', 'Asia/Jakarta'));
    jualLaporan($this->kasir, [[$this->mie, 1]]);
    $this->travelTo(Carbon::parse('2026-11-23 00:30', 'Asia/Jakarta'));
    jualLaporan($this->kasir, [[$this->teh, 1]]);

    $report = laporan(ReportPeriod::make('rentang', '2026-11-23', '2026-11-23'));

    expect($report['summary'])->toMatchArray(['total' => 5000, 'count' => 1]);
});

// --- Satu sumber dengan Beranda --------------------------------------------------

test('kartu Hari Ini di Beranda sama dengan laporan "hari ini"', function () {
    jualLaporan($this->kasir, [[$this->mie, 2]]);
    $batal = jualLaporan($this->kasir, [[$this->teh, 1]]);
    app(VoidSale::class)->handle($batal, $this->admin, 'batal');
    produkSiapJual(3)->update(['min_stock' => 10]);

    $today = app(TodaySummary::class)->handle();
    $summary = app(SalesReport::class)->summary(ReportPeriod::today());

    expect($today['sales_total'])->toBe($summary['total'])
        ->and($today['sales_count'])->toBe($summary['count'])
        ->and($today['low_stock'])->toBe(app(InventoryReport::class)->lowStockCount());

    // Lewat HTTP pun sama: properti Beranda = isi REST API laporan (Tahap 11A).
    $beranda = $this->actingAs($this->admin)->get(route('dashboard'))->viewData('page')['props']['today'];
    $halaman = $this->actingAs($this->admin)->getJson(route('api.reports.sales'))->json('data.report.summary');

    expect($beranda['sales_total'])->toBe($halaman['total'])
        ->and($beranda['sales_count'])->toBe($halaman['count']);
});

// --- REST API, filter, CSV (Tahap 11A) ----------------------------------------------

test('admin mengambil laporan penjualan lewat REST API dengan filter', function () {
    jualLaporan($this->kasir, [[$this->mie, 1]]);

    $this->actingAs($this->admin)
        ->getJson(route('api.reports.sales', ['periode' => 'bulan-ini', 'kasir' => $this->kasir->id]))
        ->assertOk()
        ->assertJsonPath('data.filters.preset', 'bulan-ini')
        ->assertJsonPath('data.filters.kasir', $this->kasir->id)
        ->assertJsonPath('data.report.summary.total', 3000)
        ->assertJsonCount(1, 'data.cashiers');
});

test('halaman laporan penjualan hanya kerangka: datanya dari REST API', function () {
    $this->actingAs($this->admin)
        ->get(route('reports.sales', ['periode' => 'bulan-ini']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('laporan/penjualan')
            ->missing('report')
            ->missing('filters'));
});

test('rentang bebas divalidasi (422 JSON)', function () {
    $today = now(config('app.display_timezone'))->format('Y-m-d');
    $tomorrow = now(config('app.display_timezone'))->addDay()->format('Y-m-d');
    $get = fn (array $q) => $this->getJson(route('api.reports.sales', $q));

    $this->actingAs($this->admin);
    $get(['periode' => 'rentang'])->assertUnprocessable()->assertJsonValidationErrors(['dari', 'sampai']);
    $get(['periode' => 'rentang', 'dari' => $today, 'sampai' => '2020-01-01'])->assertJsonValidationErrors('sampai');
    $get(['periode' => 'rentang', 'dari' => $today, 'sampai' => $tomorrow])->assertJsonValidationErrors('sampai');
    $get(['periode' => 'rentang', 'dari' => '2024-01-01', 'sampai' => $today])->assertJsonValidationErrors('sampai');
    $get(['periode' => 'tahunan'])->assertJsonValidationErrors('periode');
});

test('CSV penjualan: pemisah titik koma, satu baris per penjualan, total Selesai = total laporan', function () {
    jualLaporan($this->kasir, [[$this->mie, 2]]);
    jualLaporan($this->kasir, [[$this->teh, 1]]);
    $batal = jualLaporan($this->kasir, [[$this->mie, 3]]);
    app(VoidSale::class)->handle($batal, $this->admin, 'salah input');

    $response = $this->actingAs($this->admin)->get(route('api.reports.sales.csv', ['periode' => 'hari-ini']));
    $response->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');

    $csv = $response->streamedContent();
    expect(str_starts_with($csv, "\xEF\xBB\xBF"))->toBeTrue();

    $lines = array_values(array_filter(explode("\n", substr($csv, 3))));
    $rows = array_map(fn ($l) => str_getcsv($l, ';', '"', ''), $lines);

    expect($rows[0])->toBe(SalesReport::csvHeader())
        ->and($rows)->toHaveCount(4);

    $selesai = array_filter(array_slice($rows, 1), fn ($r) => $r[6] === 'Selesai');
    $dibatalkan = array_values(array_filter(array_slice($rows, 1), fn ($r) => $r[6] === 'Dibatalkan'));

    expect(array_sum(array_map(fn ($r) => (int) $r[5], $selesai)))
        ->toBe(laporan(ReportPeriod::today())['summary']['total'])
        ->and($dibatalkan[0][0])->toBe($batal->number)
        ->and($dibatalkan[0][7])->toBe('salah input');
});

test('CSV penjualan menetralkan teks yang bisa dibaca sebagai rumus', function () {
    [$kasirAneh] = kasirDenganShift(role: 'kasir');
    $kasirAneh->update(['name' => '@kasir']);
    $batal = jualLaporan($kasirAneh, [[$this->mie, 1]]);
    app(VoidSale::class)->handle($batal, $this->admin, '=HYPERLINK("x")');

    $csv = $this->actingAs($this->admin)->get(route('api.reports.sales.csv'))->streamedContent();

    expect($csv)->toContain(";'@kasir;")
        ->and($csv)->toContain("'=HYPERLINK(\"\"x\"\")");
});

// --- Akses ---------------------------------------------------------------------

test('kasir dan bendahara mendapat 403 di halaman dan REST API laporan, tamu ditolak', function () {
    $pages = ['reports.sales', 'reports.inventory'];
    $api = ['api.reports.sales', 'api.reports.sales.csv', 'api.reports.inventory', 'api.reports.inventory.csv'];

    foreach (['kasir', 'bendahara'] as $role) {
        $user = User::factory()->create()->assignRole($role);

        foreach ($pages as $name) {
            $this->actingAs($user)->get(route($name))->assertForbidden();
        }

        foreach ($api as $name) {
            $this->actingAs($user)->getJson(route($name))->assertForbidden();
        }
    }

    app('auth')->forgetGuards();

    foreach ($pages as $name) {
        $this->get(route($name))->assertRedirect(route('login'));
    }

    foreach ($api as $name) {
        $this->getJson(route($name))->assertUnauthorized();
    }
});
