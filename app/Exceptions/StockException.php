<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Pelanggaran aturan ledger stok. Pesannya aman ditampilkan ke pengguna.
 */
class StockException extends RuntimeException
{
    public static function insufficient(string $productName, int $available, int $requested): self
    {
        return new self("Stok {$productName} tidak cukup: tersedia {$available}, diminta {$requested} (satuan dasar).");
    }

    public static function invalid(string $message): self
    {
        return new self($message);
    }
}
