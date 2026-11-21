<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;

/** Transaksi dibuka: barang pertama masuk keranjang. Dikirim dari browser. */
class SaleOpened implements StoreEvent
{
    use Dispatchable;

    public function __construct(
        public readonly int $cashierId,
        public readonly string $cashierName,
    ) {}

    public static function name(): string
    {
        return 'sale.opened';
    }

    public function toArray(): array
    {
        return ['cashier_id' => $this->cashierId, 'cashier' => $this->cashierName];
    }
}
