<?php

namespace App\Actions\Pos;

use App\Actions\Activity\LogActivity;
use App\Actions\Inventory\AdjustStock;
use App\Enums\Role;
use App\Enums\StockMovementType;
use App\Events\SaleVoided;
use App\Exceptions\PosException;
use App\Models\CashShift;
use App\Models\Sale;
use App\Models\SaleVoid;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Batalkan penjualan (docs/skema.md K5): hanya admin, hanya selama shift penjualan
 * itu masih terbuka, alasan wajib, sekali saja. Penjualan tidak diubah; yang ditambah
 * adalah baris sale_voids dan mutasi stok pembalik (sale_void).
 */
class VoidSale
{
    public function __construct(
        private AdjustStock $adjustStock,
        private LogActivity $logActivity,
    ) {}

    public function handle(Sale $sale, User $by, string $reason): SaleVoid
    {
        if (! $by->hasRole(Role::Admin->value)) {
            throw PosException::invalid('Hanya admin yang boleh membatalkan penjualan.');
        }

        $reason = trim($reason);
        if ($reason === '') {
            throw PosException::invalid('Alasan pembatalan wajib diisi.');
        }

        return DB::transaction(function () use ($sale, $by, $reason) {
            // Kunci shift: tidak bisa bersamaan dengan penutupan shift.
            $shift = CashShift::whereKey($sale->cash_shift_id)->lockForUpdate()->firstOrFail();

            if (! $shift->isOpen()) {
                throw PosException::invalid('Shift penjualan ini sudah ditutup, penjualan tidak bisa dibatalkan.');
            }
            if (SaleVoid::where('sale_id', $sale->id)->exists()) {
                throw PosException::invalid('Penjualan ini sudah dibatalkan.');
            }

            $void = SaleVoid::create([
                'sale_id' => $sale->id,
                'reason' => $reason,
                'created_by' => $by->id,
            ]);

            $movements = StockMovement::query()
                ->whereIn('sale_item_id', $sale->items()->pluck('id'))
                ->where('type', StockMovementType::Sale)
                ->orderBy('id')
                ->get();

            foreach ($movements as $movement) {
                $this->adjustStock->reverse($movement, $by->id, $reason);
            }

            $this->logActivity->handle('sale.voided', $sale, [
                'number' => $sale->number,
                'total' => $sale->total,
                'reason' => $reason,
            ], $by->id);

            SaleVoided::dispatch($sale->id, $sale->number, $sale->total, $reason, $by->id);

            return $void;
        });
    }
}
