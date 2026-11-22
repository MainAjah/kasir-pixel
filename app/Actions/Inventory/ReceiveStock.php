<?php

namespace App\Actions\Inventory;

use App\Actions\Activity\LogActivity;
use App\Enums\StockMovementType;
use App\Exceptions\StockException;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\StockEntry;
use App\Models\Supplier;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Catat penerimaan barang: satu dokumen StockEntry berisi satu mutasi `receipt` per baris.
 * Stok tetap hanya di ledger (lewat AdjustStock); dokumen ini tanpa saldo.
 *
 * Tahap 6B: supplier dari data master boleh dipilih (opsional). Namanya disalin ke
 * `supplier_name`; bila tidak dipilih, nama pemasok teks bebas dipakai seperti biasa.
 */
class ReceiveStock
{
    public function __construct(
        private AdjustStock $adjustStock,
        private LogActivity $logActivity,
    ) {}

    /**
     * @param  array<int, array{product_id: int, product_unit_id: int, qty: int, cost_total?: int|null}>  $lines
     */
    public function handle(
        int $userId,
        array $lines,
        ?string $supplierName = null,
        ?string $note = null,
        ?CarbonInterface $occurredAt = null,
        ?int $supplierId = null,
    ): StockEntry {
        if ($lines === []) {
            throw StockException::invalid('Penerimaan barang minimal satu baris.');
        }

        $supplier = null;

        if ($supplierId !== null) {
            $supplier = Supplier::query()->whereKey($supplierId)->where('is_active', true)->first();

            if ($supplier === null) {
                throw StockException::invalid('Supplier tidak ditemukan atau sudah dinonaktifkan.');
            }

            $supplierName = $supplier->name;
        }

        return DB::transaction(function () use ($userId, $lines, $supplier, $supplierName, $note, $occurredAt) {
            // Simpan dalam zona waktu database (UTC), apa pun zona input.
            $occurredAt = ($occurredAt ?? now())->copy()->setTimezone(config('app.timezone'));

            $entry = StockEntry::create([
                'number' => $this->nextNumber($occurredAt),
                'supplier_id' => $supplier?->id,
                'supplier_name' => $supplierName,
                'note' => $note,
                'occurred_at' => $occurredAt,
                'created_by' => $userId,
            ]);

            foreach ($lines as $line) {
                $product = Product::findOrFail($line['product_id']);
                $unit = ProductUnit::findOrFail($line['product_unit_id']);

                $this->adjustStock->handle(
                    $product,
                    StockMovementType::Receipt,
                    $unit,
                    (int) $line['qty'],
                    $userId,
                    entry: $entry,
                    costTotal: $line['cost_total'] ?? null,
                    occurredAt: $occurredAt,
                );
            }

            $this->logActivity->handle('stock.received', $entry, ['number' => $entry->number, 'lines' => count($lines)], $userId);

            return $entry;
        });
    }

    /** Nomor BM-20261121-0001: urut per hari, dihitung di dalam transaksi. */
    private function nextNumber(CarbonInterface $date): string
    {
        $prefix = 'BM-'.$date->copy()->timezone(config('app.display_timezone'))->format('Ymd').'-';

        $last = StockEntry::where('number', 'like', $prefix.'%')
            ->orderByDesc('number')
            ->lockForUpdate()
            ->value('number');

        $next = $last === null ? 1 : ((int) substr($last, strlen($prefix))) + 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
