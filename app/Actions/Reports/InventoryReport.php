<?php

namespace App\Actions\Reports;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Support\ReportPeriod;
use Illuminate\Support\Collection;

/**
 * Laporan inventaris (Tahap 6C). Hanya membaca; semua angka stok dari ledger
 * stock_movements. Produk aktif saja, sama dengan kartu Beranda dan rak.
 *
 * - Stok saat ini: Product::withStock (balance_after mutasi dengan id terbesar,
 *   urutan yang sama dengan AdjustStock). Scope itu dipanggil, tidak ditulis ulang.
 * - Status: kosong bila stok ≤ 0, menipis bila stok ≤ minimum, aman di atasnya.
 *   Menipis + kosong = Product::lowStock = "Stok menipis" di Beranda.
 * - Nilai stok: stok × harga jual satuan dasar (keputusan pemilik).
 * - Mutasi periode (occurred_at di periode): masuk = opening + receipt,
 *   keluar = sale + sale_void (bersih), penyesuaian = adjustment.
 * - Saldo awal/akhir periode: JUMLAH qty sebelum awal / sampai akhir periode,
 *   bukan balance_after per tanggal, karena Barang masuk boleh bertanggal mundur
 *   (urutan occurred_at bisa berbeda dari urutan id). Jumlah tidak bergantung
 *   urutan, dan saldo akhir hari ini = stok saat ini.
 */
class InventoryReport
{
    public const STATUSES = ['aman', 'menipis', 'kosong'];

    private const GROUPS = [
        StockMovementType::Opening->value => 'in',
        StockMovementType::Receipt->value => 'in',
        StockMovementType::Sale->value => 'out',
        StockMovementType::SaleVoid->value => 'out',
        StockMovementType::Adjustment->value => 'adjust',
    ];

    public static function statusFor(int $stock, int $minStock): string
    {
        return match (true) {
            $stock <= 0 => 'kosong',
            $stock <= $minStock => 'menipis',
            default => 'aman',
        };
    }

    /** Stok menipis termasuk kosong: angka yang sama dengan kartu "Hari Ini" di Beranda. */
    public function lowStockCount(): int
    {
        return Product::query()->where('is_active', true)->lowStock()->count();
    }

    /**
     * @return array{
     *     summary: array{products: int, aman: int, menipis: int, kosong: int, low: int, value: int},
     *     products: list<array<string, mixed>>,
     *     movements: array{in: int, out: int, adjust: int}
     * }
     */
    public function handle(ReportPeriod $period): array
    {
        $rows = $this->rows($period);

        $count = fn (string $status) => $rows->where('status', $status)->count();

        return [
            'summary' => [
                'products' => $rows->count(),
                'aman' => $count('aman'),
                'menipis' => $count('menipis'),
                'kosong' => $count('kosong'),
                'low' => $count('menipis') + $count('kosong'),
                'value' => (int) $rows->sum('value'),
            ],
            'products' => $rows->values()->all(),
            'movements' => [
                'in' => (int) $rows->sum('in'),
                'out' => (int) $rows->sum('out'),
                'adjust' => (int) $rows->sum('adjust'),
            ],
        ];
    }

    /** @return list<string> */
    public static function csvHeader(): array
    {
        return [
            'SKU', 'Nama', 'Kategori', 'Satuan dasar', 'Stok', 'Stok minimum', 'Status',
            'Harga jual', 'Nilai stok', 'Saldo awal', 'Masuk', 'Keluar', 'Penyesuaian', 'Saldo akhir',
        ];
    }

    /** @return iterable<array<int, string|int|null>> */
    public function csvRows(ReportPeriod $period): iterable
    {
        foreach ($this->rows($period) as $r) {
            yield [
                $r['sku'], $r['name'], $r['category'], $r['unit'], $r['stock'], $r['min_stock'],
                $r['status'], $r['price'], $r['value'], $r['opening'], $r['in'], $r['out'],
                $r['adjust'], $r['closing'],
            ];
        }
    }

    /** @return Collection<int, array<string, mixed>> */
    private function rows(ReportPeriod $period): Collection
    {
        [$from, $until] = $period->utcRange();

        $products = Product::query()
            ->withStock()
            ->with(['category:id,name', 'baseUnit:id,product_id,name,sell_price'])
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $ids = $products->pluck('id');

        $opening = StockMovement::query()
            ->whereIn('product_id', $ids)
            ->where('occurred_at', '<', $from)
            ->selectRaw('product_id, SUM(qty) AS qty')
            ->groupBy('product_id')
            ->pluck('qty', 'product_id');

        $closing = StockMovement::query()
            ->whereIn('product_id', $ids)
            ->where('occurred_at', '<=', $until)
            ->selectRaw('product_id, SUM(qty) AS qty')
            ->groupBy('product_id')
            ->pluck('qty', 'product_id');

        $byType = StockMovement::query()
            ->whereIn('product_id', $ids)
            ->whereBetween('occurred_at', [$from, $until])
            ->selectRaw('product_id, type, SUM(qty) AS qty')
            ->groupBy('product_id', 'type')
            ->get();

        $moves = [];

        foreach ($byType as $m) {
            $type = $m->type instanceof StockMovementType ? $m->type->value : (string) $m->type;
            $group = self::GROUPS[$type];
            $moves[$m->product_id][$group] = ($moves[$m->product_id][$group] ?? 0) + (int) $m->qty;
        }

        return $products->map(function (Product $p) use ($opening, $closing, $moves) {
            $stock = (int) ($p->stock ?? 0);
            $price = (int) ($p->baseUnit?->sell_price ?? 0);

            return [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'category' => $p->category?->name,
                'unit' => $p->baseUnit?->name,
                'stock' => $stock,
                'min_stock' => $p->min_stock,
                'status' => self::statusFor($stock, $p->min_stock),
                'price' => $price,
                'value' => $stock * $price,
                'opening' => (int) $opening->get($p->id, 0),
                'in' => $moves[$p->id]['in'] ?? 0,
                'out' => $moves[$p->id]['out'] ?? 0,
                'adjust' => $moves[$p->id]['adjust'] ?? 0,
                'closing' => (int) $closing->get($p->id, 0),
            ];
        });
    }
}
