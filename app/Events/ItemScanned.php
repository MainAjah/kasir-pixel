<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;

/** Barang dipindai atau dipilih ke keranjang. Dikirim dari browser. */
class ItemScanned implements StoreEvent
{
    use Dispatchable;

    public function __construct(
        public readonly int $cashierId,
        public readonly string $cashierName,
        public readonly string $productName,
        public readonly string $unitName,
        public readonly int $qty,
    ) {}

    public static function name(): string
    {
        return 'item.scanned';
    }

    public function toArray(): array
    {
        return [
            'cashier_id' => $this->cashierId,
            'cashier' => $this->cashierName,
            'product' => $this->productName,
            'unit' => $this->unitName,
            'qty' => $this->qty,
        ];
    }
}
