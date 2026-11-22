<?php

namespace App\Actions\Reports;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleVoid;
use App\Models\User;
use App\Support\ReportPeriod;
use Illuminate\Database\Eloquent\Builder;

/**
 * Laporan penjualan (Tahap 6C). Hanya membaca.
 *
 * Penjualan sah = penjualan di periode yang TIDAK punya baris sale_voids.
 * Penjualan yang dibatalkan tidak dihitung di angka mana pun (total, per hari,
 * produk terlaris, per kasir) dan tampil terpisah. Penjualan dihitung menurut
 * tanggal penjualan (zona tampilan). Uang selalu bilangan bulat rupiah.
 *
 * `summary()` juga dipakai kartu "Hari Ini" di Beranda (TodaySummary), jadi
 * angkanya tidak pernah berbeda dengan laporan.
 */
class SalesReport
{
    public const TOP_PRODUCTS = 10;

    /** @return array{total: int, count: int, average: int} */
    public function summary(ReportPeriod $period, ?int $cashierId = null): array
    {
        $valid = $this->valid($period, $cashierId);
        $total = (int) (clone $valid)->sum('total');
        $count = (clone $valid)->count();

        return [
            'total' => $total,
            'count' => $count,
            // Dibulatkan ke rupiah terdekat.
            'average' => $count > 0 ? (int) round($total / $count) : 0,
        ];
    }

    /**
     * @return array{
     *     summary: array{total: int, count: int, average: int},
     *     daily: list<array{date: string, total: int, count: int}>,
     *     top_products: list<array{product_id: int, name: string, unit: string|null, qty: int, revenue: int, sales: int}>,
     *     cashiers: list<array{user_id: int, name: string, count: int, total: int}>,
     *     voided: array{count: int, total: int, rows: list<array<string, mixed>>}
     * }
     */
    public function handle(ReportPeriod $period, ?int $cashierId = null): array
    {
        return [
            'summary' => $this->summary($period, $cashierId),
            'daily' => $this->daily($period, $cashierId),
            'top_products' => $this->topProducts($period, $cashierId),
            'cashiers' => $this->cashiers($period, $cashierId),
            'voided' => $this->voided($period, $cashierId),
        ];
    }

    /** Pengguna yang pernah membuat penjualan (untuk filter kasir). @return list<array{id: int, name: string}> */
    public function cashierOptions(): array
    {
        $ids = Sale::query()->distinct()->pluck('created_by');

        return User::withTrashed()
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name])
            ->all();
    }

    /**
     * Baris CSV: satu baris per penjualan (sah dan dibatalkan), urut waktu.
     *
     * @return iterable<array<int, string|int|null>>
     */
    public function csvRows(ReportPeriod $period, ?int $cashierId = null): iterable
    {
        $tz = ReportPeriod::tz();

        $sales = $this->base($period, $cashierId)
            ->with(['cashier' => fn ($q) => $q->withTrashed()->select('id', 'name'), 'void:id,sale_id,reason'])
            ->withCount('items')
            ->orderBy('created_at')
            ->orderBy('id')
            ->cursor();

        foreach ($sales as $sale) {
            $at = $sale->created_at->timezone($tz);

            yield [
                $sale->number,
                $at->format('Y-m-d'),
                $at->format('H:i'),
                $sale->cashier?->name,
                $sale->items_count,
                $sale->total,
                $sale->void ? 'Dibatalkan' : 'Selesai',
                $sale->void?->reason,
            ];
        }
    }

    /** @return list<string> */
    public static function csvHeader(): array
    {
        return ['Nomor', 'Tanggal', 'Jam', 'Kasir', 'Jumlah barang', 'Total', 'Status', 'Alasan batal'];
    }

    // ---- Bagian dalam -------------------------------------------------------

    /** Semua penjualan di periode (sah dan dibatalkan). @return Builder<Sale> */
    private function base(ReportPeriod $period, ?int $cashierId): Builder
    {
        return Sale::query()
            ->whereBetween('created_at', $period->utcRange())
            ->when($cashierId !== null, fn (Builder $q) => $q->where('created_by', $cashierId));
    }

    /** Penjualan sah: tanpa pembatalan. @return Builder<Sale> */
    private function valid(ReportPeriod $period, ?int $cashierId): Builder
    {
        return $this->base($period, $cashierId)->whereDoesntHave('void');
    }

    /** @return list<array{date: string, total: int, count: int}> */
    private function daily(ReportPeriod $period, ?int $cashierId): array
    {
        $tz = ReportPeriod::tz();
        $days = array_fill_keys($period->days(), ['total' => 0, 'count' => 0]);

        foreach ($this->valid($period, $cashierId)->get(['id', 'total', 'created_at']) as $sale) {
            $date = $sale->created_at->timezone($tz)->format('Y-m-d');
            $days[$date]['total'] += $sale->total;
            $days[$date]['count'] += 1;
        }

        return array_map(
            fn (string $date) => ['date' => $date] + $days[$date],
            array_keys($days),
        );
    }

    /** @return list<array{product_id: int, name: string, unit: string|null, qty: int, revenue: int, sales: int}> */
    private function topProducts(ReportPeriod $period, ?int $cashierId): array
    {
        $validIds = $this->valid($period, $cashierId)->select('id');

        $rows = SaleItem::query()
            ->whereIn('sale_id', $validIds)
            ->selectRaw('product_id, SUM(base_qty) AS qty, SUM(line_total) AS revenue, COUNT(DISTINCT sale_id) AS sales')
            ->groupBy('product_id')
            ->orderByDesc('qty')
            ->orderByDesc('revenue')
            ->orderBy('product_id')
            ->limit(self::TOP_PRODUCTS)
            ->get();

        $products = Product::withTrashed()
            ->with('baseUnit:id,product_id,name')
            ->whereIn('id', $rows->pluck('product_id'))
            ->get(['id', 'name'])
            ->keyBy('id');

        return $rows->map(fn ($r) => [
            'product_id' => (int) $r->product_id,
            'name' => $products->get($r->product_id)?->name ?? '-',
            'unit' => $products->get($r->product_id)?->baseUnit?->name,
            'qty' => (int) $r->qty,
            'revenue' => (int) $r->revenue,
            'sales' => (int) $r->sales,
        ])->values()->all();
    }

    /** @return list<array{user_id: int, name: string, count: int, total: int}> */
    private function cashiers(ReportPeriod $period, ?int $cashierId): array
    {
        $rows = $this->valid($period, $cashierId)
            ->selectRaw('created_by, COUNT(*) AS sales_count, SUM(total) AS sales_total')
            ->groupBy('created_by')
            ->orderByDesc('sales_total')
            ->get();

        $names = User::withTrashed()->whereIn('id', $rows->pluck('created_by'))->pluck('name', 'id');

        return $rows->map(fn ($r) => [
            'user_id' => (int) $r->created_by,
            'name' => $names->get($r->created_by) ?? '-',
            'count' => (int) $r->sales_count,
            'total' => (int) $r->sales_total,
        ])->values()->all();
    }

    /** @return array{count: int, total: int, rows: list<array<string, mixed>>} */
    private function voided(ReportPeriod $period, ?int $cashierId): array
    {
        $tz = ReportPeriod::tz();

        $sales = $this->base($period, $cashierId)
            ->whereHas('void')
            ->with([
                'cashier' => fn ($q) => $q->withTrashed()->select('id', 'name'),
                'void' => fn ($q) => $q->with(['creator' => fn ($c) => $c->withTrashed()->select('id', 'name')]),
            ])
            ->orderBy('created_at')
            ->get();

        return [
            'count' => $sales->count(),
            'total' => (int) $sales->sum('total'),
            'rows' => $sales->map(function (Sale $s) use ($tz) {
                /** @var SaleVoid $void */
                $void = $s->void;

                return [
                    'number' => $s->number,
                    'sold_at' => $s->created_at->timezone($tz)->format('d/m/Y H:i'),
                    'cashier' => $s->cashier?->name,
                    'total' => $s->total,
                    'reason' => $void->reason,
                    'voided_by' => $void->creator?->name,
                    'voided_at' => $void->created_at?->timezone($tz)->format('d/m/Y H:i'),
                ];
            })->all(),
        ];
    }
}
