<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Pelanggaran aturan ledger stok. Pesannya aman ditampilkan ke pengguna.
 *
 * Untuk stok kurang, barang yang gagal ikut dibawa (productId, productName,
 * available, requested; satuan dasar) supaya klien API bisa menunjuk barisnya.
 */
class StockException extends RuntimeException
{
    public ?int $productId = null;

    public ?string $productName = null;

    public ?int $available = null;

    public ?int $requested = null;

    public static function insufficient(string $productName, int $available, int $requested, ?int $productId = null): self
    {
        $e = new self("Stok {$productName} tidak cukup: tersedia {$available}, diminta {$requested} (satuan dasar).");
        $e->productId = $productId;
        $e->productName = $productName;
        $e->available = $available;
        $e->requested = $requested;

        return $e;
    }

    public static function invalid(string $message): self
    {
        return new self($message);
    }

    /** Stok kurang (bukan pelanggaran bentuk mutasi). */
    public function isInsufficient(): bool
    {
        return $this->requested !== null;
    }
}
