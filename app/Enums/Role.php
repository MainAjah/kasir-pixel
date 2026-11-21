<?php

namespace App\Enums;

/**
 * Tiga peran versi tugas (docs/skema.md bagian 3.1).
 */
enum Role: string
{
    case Admin = 'admin';
    case Kasir = 'kasir';
    case Bendahara = 'bendahara';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin',
            self::Kasir => 'Kasir',
            self::Bendahara => 'Bendahara',
        };
    }
}
