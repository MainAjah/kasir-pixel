<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Pelanggaran aturan kasir (shift, penjualan, pembatalan). Pesannya aman ditampilkan ke pengguna.
 */
class PosException extends RuntimeException
{
    public static function invalid(string $message): self
    {
        return new self($message);
    }
}
