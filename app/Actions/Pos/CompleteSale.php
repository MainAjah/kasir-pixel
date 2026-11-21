<?php

namespace App\Actions\Pos;

use App\Actions\Inventory\AdjustStock;
use App\Enums\PaymentMethod;
use App\Enums\StockMovementType;
use App\Events\SaleCompleted;
use App\Exceptions\PosException;
use App\Models\CashShift;
use App\Models\ProductUnit;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Selesaikan penjualan tunai dalam satu transaksi database (docs/skema.md K1-K3).
 *
 * Browser hanya mengirim satuan dan jumlah; harga selalu dibaca dari server.
 * Stok kurang (StockException dari AdjustStock) membatalkan seluruh penjualan.
 */
class CompleteSale
{
    public function __construct(private AdjustStock $adjustStock) {}

    /**
     * @param  array<int, array{product_unit_id: int|string, qty: int|string}>  $items
     */
    public function handle(User $cashier, array $items, int $tendered): Sale
    {
        $lines = $this->mergeLines($items);

        return DB::transaction(function () use ($cashier, $lines, $tendered) {
            // Kunci baris shift: tidak bisa bersamaan dengan penutupan shift.
            $shift = CashShift::where('user_id', $cashier->id)->whereNull('closed_at')->lockForUpdate()->first();

            if ($shift === null) {
                throw PosException::invalid('Buka shift dulu sebelum menjual.');
            }

            $units = ProductUnit::with('product')->whereIn('id', array_keys($lines))->get()->keyBy('id');

            $total = 0;
            $prepared = [];

            foreach ($lines as $unitId => $qty) {
                $unit = $units->get($unitId);
                $product = $unit?->product;

                if ($unit === null || $product === null) {
                    throw PosException::invalid('Ada barang yang tidak ditemukan atau sudah dihapus.');
                }
                if (! $product->is_active) {
                    throw PosException::invalid("Produk {$product->name} sedang nonaktif.");
                }

                $lineTotal = $qty * $unit->sell_price;
                $total += $lineTotal;
                $prepared[] = compact('unit', 'product', 'qty', 'lineTotal');
            }

            if ($total <= 0) {
                throw PosException::invalid('Total penjualan harus lebih dari nol.');
            }
            if ($tendered < $total) {
                throw PosException::invalid('Uang diterima kurang dari total belanja.');
            }

            $sale = Sale::create([
                'number' => $this->nextNumber(),
                'cash_shift_id' => $shift->id,
                'total' => $total,
                'created_by' => $cashier->id,
            ]);

            $eventItems = [];

            foreach ($prepared as $p) {
                $item = $sale->items()->create([
                    'product_id' => $p['product']->id,
                    'product_unit_id' => $p['unit']->id,
                    'product_name' => $p['product']->name,
                    'unit_name' => $p['unit']->name,
                    'conversion' => $p['unit']->conversion,
                    'qty' => $p['qty'],
                    'base_qty' => $p['qty'] * $p['unit']->conversion,
                    'unit_price' => $p['unit']->sell_price,
                    'line_total' => $p['lineTotal'],
                ]);

                $this->adjustStock->handle(
                    $p['product'],
                    StockMovementType::Sale,
                    $p['unit'],
                    -$p['qty'],
                    $cashier->id,
                    saleItemId: $item->id,
                );

                $eventItems[] = ['name' => $item->product_name, 'unit' => $item->unit_name, 'qty' => $item->qty];
            }

            $sale->payments()->create([
                'method' => PaymentMethod::Cash,
                'amount' => $total,
                'tendered' => $tendered,
                'change' => $tendered - $total,
            ]);

            SaleCompleted::dispatch($sale->id, $sale->number, $total, $eventItems, $cashier->id, $cashier->name);

            return $sale->load(['items', 'payments']);
        });
    }

    /**
     * Gabungkan baris dengan satuan sama dan pastikan jumlahnya bilangan bulat positif.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, int> product_unit_id => qty
     */
    private function mergeLines(array $items): array
    {
        if ($items === []) {
            throw PosException::invalid('Keranjang kosong.');
        }

        $lines = [];

        foreach ($items as $row) {
            $unitId = filter_var($row['product_unit_id'] ?? null, FILTER_VALIDATE_INT);
            $qty = filter_var($row['qty'] ?? null, FILTER_VALIDATE_INT);

            if ($unitId === false || $qty === false || $qty < 1) {
                throw PosException::invalid('Jumlah barang harus bilangan bulat minimal 1.');
            }

            $lines[$unitId] = ($lines[$unitId] ?? 0) + $qty;
        }

        return $lines;
    }

    /** Nomor INV-yyyymmdd-nnnn: urut per hari (tanggal WIB), dihitung di dalam transaksi. */
    private function nextNumber(): string
    {
        $prefix = 'INV-'.now()->timezone(config('app.display_timezone'))->format('Ymd').'-';

        $last = Sale::where('number', 'like', $prefix.'%')
            ->orderByDesc('number')
            ->lockForUpdate()
            ->value('number');

        $next = $last === null ? 1 : ((int) substr($last, strlen($prefix))) + 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
