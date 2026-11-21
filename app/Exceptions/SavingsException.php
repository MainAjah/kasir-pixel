<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Pelanggaran aturan simpanan atau anggota. Pesannya aman ditampilkan ke pengguna.
 */
class SavingsException extends RuntimeException
{
    public static function invalid(string $message): self
    {
        return new self($message);
    }
}
