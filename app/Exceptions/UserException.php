<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Pelanggaran aturan kelola pengguna (Tahap 6B). Pesannya aman ditampilkan.
 */
class UserException extends RuntimeException
{
    public static function cannotDeactivateSelf(): self
    {
        return new self('Anda tidak bisa menonaktifkan akun sendiri.');
    }

    public static function lastAdmin(): self
    {
        return new self('Harus tetap ada minimal satu admin aktif.');
    }

    public static function cannotChangeOwnRole(): self
    {
        return new self('Anda tidak bisa mengubah peran sendiri.');
    }
}
