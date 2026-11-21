<?php

namespace App\Events;

/**
 * Peristiwa toko yang akan menggerakkan diorama (Tahap 5 dan 8).
 *
 * Muatan hanya data biasa (string, angka, array), tanpa model Eloquent,
 * sehingga siap disiarkan lewat Reverb tanpa mengubah kelas.
 */
interface StoreEvent
{
    /** Nama peristiwa yang sama dengan di frontend (resources/js/lib/store-events.ts). */
    public static function name(): string;

    /** @return array<string, mixed> */
    public function toArray(): array;
}
