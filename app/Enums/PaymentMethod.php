<?php

namespace App\Enums;

/**
 * Cara bayar. Versi tugas hanya tunai; enum memudahkan menambah cara lain nanti.
 */
enum PaymentMethod: string
{
    case Cash = 'cash';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Tunai',
        };
    }
}
