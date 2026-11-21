<?php

namespace App\Enums;

/**
 * Jenis mutasi stok (docs/skema.md 3.2).
 */
enum StockMovementType: string
{
    case Opening = 'opening';
    case Receipt = 'receipt';
    case Sale = 'sale';
    case SaleVoid = 'sale_void';
    case Adjustment = 'adjustment';

    public function label(): string
    {
        return match ($this) {
            self::Opening => 'Saldo awal',
            self::Receipt => 'Penerimaan',
            self::Sale => 'Penjualan',
            self::SaleVoid => 'Pembatalan penjualan',
            self::Adjustment => 'Koreksi',
        };
    }
}
