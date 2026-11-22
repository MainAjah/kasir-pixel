<?php

namespace App\Actions\Dashboard;

use App\Models\Product;
use App\Models\Sale;
use Illuminate\Support\Carbon;

/**
 * Angka kartu "Hari Ini" di Beranda (Tahap 5D-1). Hanya membaca.
 *
 * "Hari ini" mengikuti zona tampilan (app.display_timezone), sama dengan nomor
 * faktur. Penjualan yang dibatalkan tidak dihitung. Stok menipis = produk aktif
 * yang stoknya di bawah atau sama dengan stok minimum (termasuk yang kosong).
 */
class TodaySummary
{
    /** @return array{sales_total: int, sales_count: int, low_stock: int} */
    public function handle(?Carbon $now = null): array
    {
        $tz = config('app.display_timezone');
        $now = ($now ?? now())->copy()->timezone($tz);
        $from = $now->copy()->startOfDay()->timezone(config('app.timezone'));
        $until = $now->copy()->endOfDay()->timezone(config('app.timezone'));

        $sales = Sale::query()
            ->whereBetween('created_at', [$from, $until])
            ->whereDoesntHave('void');

        return [
            'sales_total' => (int) (clone $sales)->sum('total'),
            'sales_count' => (clone $sales)->count(),
            'low_stock' => Product::query()->where('is_active', true)->lowStock()->count(),
        ];
    }
}
