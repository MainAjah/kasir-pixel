<?php

namespace App\Actions\Inventory;

use App\Enums\StockMovementType;
use App\Exceptions\StockException;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\StockEntry;
use App\Models\StockMovement;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Satu-satunya pintu penulisan ke ledger stok (stock_movements).
 *
 * Aturan (docs/skema.md bagian 4):
 *  - qty selalu dalam satuan dasar = input_qty x conversion satuan yang diketik;
 *  - balance_after = saldo terakhir + qty, ditulis sekali;
 *  - saldo tidak boleh minus untuk jenis mutasi apa pun;
 *  - koreksi lewat baris pembalik (reverse) atau mutasi `adjustment`, bukan edit.
 */
class AdjustStock
{
    /**
     * Catat satu mutasi.
     *
     * @param  int  $inputQty  Bertanda dan dalam satuan $unit. opening/receipt/sale_void harus positif,
     *                         sale harus negatif, adjustment boleh keduanya.
     */
    public function handle(
        Product $product,
        StockMovementType $type,
        ProductUnit $unit,
        int $inputQty,
        int $userId,
        ?StockEntry $entry = null,
        ?int $saleItemId = null,
        ?string $note = null,
        ?int $costTotal = null,
        ?CarbonInterface $occurredAt = null,
    ): StockMovement {
        if ($type === StockMovementType::SaleVoid) {
            throw StockException::invalid('Pembatalan penjualan harus lewat reverse(), bukan handle().');
        }

        return $this->post($product, $type, $unit, $inputQty, $userId, $entry, $saleItemId, null, $note, $costTotal, $occurredAt);
    }

    /**
     * Balik satu mutasi dengan baris baru berlawanan tanda.
     *
     * Mutasi `sale` dibalik dengan jenis `sale_void`; mutasi lain dengan `adjustment`
     * (catatan wajib). Baris pembalik sendiri tidak bisa dibalik lagi.
     */
    public function reverse(
        StockMovement $original,
        int $userId,
        ?string $note = null,
        ?int $saleItemId = null,
        ?CarbonInterface $occurredAt = null,
    ): StockMovement {
        if ($original->reverses_movement_id !== null) {
            throw StockException::invalid('Baris pembalik tidak bisa dibalik lagi.');
        }

        $type = $original->type === StockMovementType::Sale
            ? StockMovementType::SaleVoid
            : StockMovementType::Adjustment;

        $product = Product::findOrFail($original->product_id);
        $unit = ProductUnit::withTrashed()->findOrFail($original->input_unit_id);

        return $this->post($product, $type, $unit, -$original->input_qty, $userId, null, $saleItemId ?? $original->sale_item_id, $original, $note, null, $occurredAt);
    }

    private function post(
        Product $product,
        StockMovementType $type,
        ProductUnit $unit,
        int $inputQty,
        int $userId,
        ?StockEntry $entry,
        ?int $saleItemId,
        ?StockMovement $reverses,
        ?string $note,
        ?int $costTotal,
        ?CarbonInterface $occurredAt,
    ): StockMovement {
        $this->validateShape($type, $unit, $product, $inputQty, $entry, $saleItemId, $reverses, $note, $costTotal);

        return DB::transaction(function () use ($product, $type, $unit, $inputQty, $userId, $entry, $saleItemId, $reverses, $note, $costTotal, $occurredAt) {
            // Kunci baris produk agar saldo terakhir yang dibaca tidak berubah sebelum insert.
            $locked = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();

            $last = StockMovement::where('product_id', $locked->id)->orderByDesc('id')->first();
            $previous = $last?->balance_after ?? 0;

            if ($type === StockMovementType::Opening && $last !== null) {
                throw StockException::invalid("Saldo awal hanya boleh untuk produk yang belum punya mutasi ({$locked->name}).");
            }

            if ($reverses !== null && StockMovement::where('reverses_movement_id', $reverses->id)->exists()) {
                throw StockException::invalid('Mutasi ini sudah pernah dibalik.');
            }

            $qty = $inputQty * $unit->conversion;
            $balanceAfter = $previous + $qty;

            if ($balanceAfter < 0) {
                throw StockException::insufficient($locked->name, $previous, abs($qty), $locked->id);
            }

            return StockMovement::create([
                'product_id' => $locked->id,
                'type' => $type,
                'qty' => $qty,
                'balance_after' => $balanceAfter,
                'input_unit_id' => $unit->id,
                'input_qty' => $inputQty,
                'cost_total' => $costTotal,
                'stock_entry_id' => $entry?->id,
                'sale_item_id' => $saleItemId,
                'reverses_movement_id' => $reverses?->id,
                'note' => $note,
                'occurred_at' => ($occurredAt ?? now())->copy()->setTimezone(config('app.timezone')),
                'created_by' => $userId,
            ]);
        });
    }

    private function validateShape(
        StockMovementType $type,
        ProductUnit $unit,
        Product $product,
        int $inputQty,
        ?StockEntry $entry,
        ?int $saleItemId,
        ?StockMovement $reverses,
        ?string $note,
        ?int $costTotal,
    ): void {
        if ($inputQty === 0) {
            throw StockException::invalid('Jumlah tidak boleh nol.');
        }

        if ($unit->product_id !== $product->id) {
            throw StockException::invalid('Satuan tidak cocok dengan produk.');
        }

        // Pembalikan boleh memakai satuan yang sudah dihapus (soft delete) dari mutasi asal.
        if ($unit->trashed() && $reverses === null) {
            throw StockException::invalid('Satuan sudah dihapus.');
        }

        $signOk = match ($type) {
            StockMovementType::Opening, StockMovementType::Receipt, StockMovementType::SaleVoid => $inputQty > 0,
            StockMovementType::Sale => $inputQty < 0,
            StockMovementType::Adjustment => true,
        };

        if (! $signOk) {
            throw StockException::invalid("Tanda jumlah tidak sesuai untuk jenis mutasi {$type->label()}.");
        }

        if ($type === StockMovementType::Receipt && $entry === null) {
            throw StockException::invalid('Penerimaan harus punya dokumen penerimaan barang.');
        }

        if (in_array($type, [StockMovementType::Sale, StockMovementType::SaleVoid], true) && $saleItemId === null) {
            throw StockException::invalid('Mutasi penjualan harus menyebut baris penjualan.');
        }

        if ($type === StockMovementType::SaleVoid && $reverses?->type !== StockMovementType::Sale) {
            throw StockException::invalid('Pembatalan penjualan hanya boleh membalik mutasi penjualan.');
        }

        if ($type === StockMovementType::Adjustment && trim((string) $note) === '') {
            throw StockException::invalid('Koreksi stok wajib disertai alasan.');
        }

        if ($costTotal !== null && ($costTotal < 0 || ! in_array($type, [StockMovementType::Opening, StockMovementType::Receipt], true))) {
            throw StockException::invalid('Harga beli hanya untuk saldo awal atau penerimaan, dan tidak boleh negatif.');
        }
    }
}
