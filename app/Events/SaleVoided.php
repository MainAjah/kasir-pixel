<?php

namespace App\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/** Penjualan dibatalkan. Dipancarkan dari VoidSale hanya setelah transaksi database commit. */
class SaleVoided implements ShouldDispatchAfterCommit, StoreEvent
{
    use Dispatchable;

    public function __construct(
        public readonly int $saleId,
        public readonly string $number,
        public readonly int $total,
        public readonly string $reason,
        public readonly int $voidedById,
    ) {}

    public static function name(): string
    {
        return 'sale.voided';
    }

    public function toArray(): array
    {
        return [
            'sale_id' => $this->saleId,
            'number' => $this->number,
            'total' => $this->total,
            'reason' => $this->reason,
            'voided_by' => $this->voidedById,
        ];
    }
}
