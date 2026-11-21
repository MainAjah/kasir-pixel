<?php

namespace App\Enums;

enum MemberStatus: string
{
    case Active = 'active';
    case Exited = 'exited';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Aktif',
            self::Exited => 'Keluar',
        };
    }
}
