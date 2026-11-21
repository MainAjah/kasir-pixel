<?php

namespace App\Models\Concerns;

use LogicException;

/**
 * Baris tidak boleh diubah atau dihapus lewat model.
 *
 * Batasan: ini perlindungan di tingkat model saja. Query builder langsung
 * (DB::table(...)->update()) atau SQL manual tidak melewatinya. Versi tugas
 * tidak memakai trigger database.
 */
trait AppendOnly
{
    public const UPDATED_AT = null;

    public static function bootAppendOnly(): void
    {
        static::updating(function (): never {
            throw new LogicException(static::class.' bersifat hanya-tambah dan tidak boleh diubah.');
        });

        static::deleting(function (): never {
            throw new LogicException(static::class.' bersifat hanya-tambah dan tidak boleh dihapus.');
        });
    }
}
