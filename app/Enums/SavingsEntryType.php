<?php

namespace App\Enums;

enum SavingsEntryType: string
{
    case Deposit = 'deposit';
    case Withdrawal = 'withdrawal';
    case Reversal = 'reversal';

    public function label(): string
    {
        return match ($this) {
            self::Deposit => 'Setoran',
            self::Withdrawal => 'Penarikan',
            self::Reversal => 'Pembalikan',
        };
    }
}
