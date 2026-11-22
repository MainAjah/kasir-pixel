<?php

namespace App\Actions\Dashboard;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleVoid;

/**
 * Data polling Beranda (Tahap 5D-1, tiap 5 detik). Hanya membaca.
 *
 * Mengembalikan penjualan dan pembatalan yang lebih baru dari kursor (id terakhir
 * yang sudah dilihat browser), angka kartu "Hari Ini", isi rak, dan kursor baru.
 * Penjualan dibentuk sama dengan peristiwa `sale.completed` dari layar kasir,
 * jadi diorama memutarnya seperti penjualan biasa (dan membuang yang ganda).
 */
class DashboardFeed
{
    /** Paling banyak penjualan baru per polling; sisanya cukup tercermin di angka. */
    public const MAX_SALES = 10;

    public function __construct(
        private readonly TodaySummary $today,
        private readonly ShelfStock $shelves,
    ) {}

    /** Kursor awal: penjualan dan pembatalan yang sudah ada tidak diputar ulang. */
    public static function cursor(): array
    {
        return [
            'sale' => (int) (Sale::query()->max('id') ?? 0),
            'void' => (int) (SaleVoid::query()->max('id') ?? 0),
        ];
    }

    /**
     * @return array{
     *     sales: list<array{number: string, total: int, items: list<array{name: string, unit: string, qty: int}>}>,
     *     voids: list<array{number: string, total: int}>,
     *     today: array{sales_total: int, sales_count: int, low_stock: int},
     *     shelves: array{rak: list<string>, vending: list<string>},
     *     cursor: array{sale: int, void: int}
     * }
     */
    public function handle(int $afterSale, int $afterVoid): array
    {
        $newest = Sale::query()->where('id', '>', $afterSale)->max('id');

        $sales = Sale::query()
            ->with('items:id,sale_id,product_name,unit_name,qty')
            ->where('id', '>', $afterSale)
            ->orderByDesc('id')
            ->limit(self::MAX_SALES)
            ->get(['id', 'number', 'total'])
            ->reverse()
            ->values();

        $voids = SaleVoid::query()
            ->with('sale:id,number,total')
            ->where('id', '>', $afterVoid)
            ->orderBy('id')
            ->get(['id', 'sale_id']);

        return [
            'sales' => $sales->map(fn (Sale $sale) => [
                'number' => $sale->number,
                'total' => $sale->total,
                'items' => $sale->items->map(fn (SaleItem $item) => [
                    'name' => $item->product_name,
                    'unit' => $item->unit_name,
                    'qty' => $item->qty,
                ])->values()->all(),
            ])->all(),
            'voids' => $voids->map(fn (SaleVoid $void) => [
                'number' => $void->sale->number,
                'total' => $void->sale->total,
            ])->values()->all(),
            'today' => $this->today->handle(),
            'shelves' => $this->shelves->handle(),
            'cursor' => [
                'sale' => (int) ($newest ?? $afterSale),
                'void' => (int) ($voids->max('id') ?? $afterVoid),
            ],
        ];
    }
}
