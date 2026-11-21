<?php

namespace App\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/** Penjualan selesai. Dipancarkan dari CompleteSale hanya setelah transaksi database commit. */
class SaleCompleted implements ShouldDispatchAfterCommit, StoreEvent
{
    use Dispatchable;

    /**
     * @param  array<int, array{name: string, unit: string, qty: int}>  $items
     */
    public function __construct(
        public readonly int $saleId,
        public readonly string $number,
        public readonly int $total,
        public readonly array $items,
        public readonly int $cashierId,
        public readonly string $cashierName,
    ) {}

    public static function name(): string
    {
        return 'sale.completed';
    }

    public function toArray(): array
    {
        return [
            'sale_id' => $this->saleId,
            'number' => $this->number,
            'total' => $this->total,
            'items' => $this->items,
            'cashier_id' => $this->cashierId,
            'cashier' => $this->cashierName,
        ];
    }
}
