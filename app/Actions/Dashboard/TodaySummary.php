<?php

namespace App\Actions\Dashboard;

use App\Actions\Reports\InventoryReport;
use App\Actions\Reports\SalesReport;
use App\Support\ReportPeriod;
use Illuminate\Support\Carbon;

/**
 * Angka kartu "Hari Ini" di Beranda (Tahap 5D-1). Hanya membaca.
 *
 * Sejak Tahap 6C tidak menghitung sendiri: memakai fungsi yang sama dengan
 * laporan (SalesReport::summary untuk periode "hari ini" dan
 * InventoryReport::lowStockCount), jadi angka kartu dan laporan selalu sama.
 * Penjualan yang dibatalkan tidak dihitung; stok menipis termasuk yang kosong.
 */
class TodaySummary
{
    public function __construct(
        private readonly SalesReport $sales,
        private readonly InventoryReport $inventory,
    ) {}

    /** @return array{sales_total: int, sales_count: int, low_stock: int} */
    public function handle(?Carbon $now = null): array
    {
        $summary = $this->sales->summary(ReportPeriod::today($now));

        return [
            'sales_total' => $summary['total'],
            'sales_count' => $summary['count'],
            'low_stock' => $this->inventory->lowStockCount(),
        ];
    }
}
