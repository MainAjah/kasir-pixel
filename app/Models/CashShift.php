<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * Satu shift kasir. Transisi hanya aktif -> tutup, sekali. Setelah tutup baris tidak diubah
 * (dijaga di model; tanpa trigger database).
 *
 * @property int $id
 * @property int $user_id
 * @property Carbon $opened_at
 * @property int $opening_cash
 * @property Carbon|null $closed_at
 * @property int|null $counted_cash
 * @property int|null $expected_cash
 * @property int|null $difference
 * @property string|null $closing_note
 */
#[Fillable(['user_id', 'opened_at', 'opening_cash', 'closed_at', 'counted_cash', 'expected_cash', 'difference', 'closing_note'])]
class CashShift extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::updating(function (CashShift $shift): void {
            if ($shift->getOriginal('closed_at') !== null) {
                throw new LogicException('Shift yang sudah ditutup tidak boleh diubah.');
            }
        });

        static::deleting(function (): never {
            throw new LogicException('Shift tidak boleh dihapus.');
        });
    }

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'opening_cash' => 'integer',
            'counted_cash' => 'integer',
            'expected_cash' => 'integer',
            'difference' => 'integer',
        ];
    }

    public function isOpen(): bool
    {
        return $this->closed_at === null;
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Sale, $this> */
    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    /** Shift yang sedang aktif milik pengguna, atau null. */
    public static function activeFor(User|int $user): ?self
    {
        $id = $user instanceof User ? $user->id : $user;

        return static::where('user_id', $id)->whereNull('closed_at')->first();
    }

    /**
     * Uang tunai yang seharusnya ada di laci: kas awal + pembayaran tunai
     * dari penjualan yang tidak dibatalkan.
     */
    public function computeExpectedCash(): int
    {
        $cashSales = Payment::query()
            ->whereHas('sale', fn ($q) => $q
                ->where('cash_shift_id', $this->id)
                ->whereDoesntHave('void'))
            ->where('method', 'cash')
            ->sum('amount');

        return $this->opening_cash + (int) $cashSales;
    }
}
