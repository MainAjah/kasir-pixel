<?php

namespace App\Enums;

/**
 * Jenis simpanan (docs/skema.md 3.4).
 */
enum SavingsType: string
{
    case Pokok = 'pokok';
    case Wajib = 'wajib';
    case Sukarela = 'sukarela';

    public function label(): string
    {
        return match ($this) {
            self::Pokok => 'Simpanan pokok',
            self::Wajib => 'Simpanan wajib',
            self::Sukarela => 'Simpanan sukarela',
        };
    }
}
