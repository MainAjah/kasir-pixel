<?php

namespace App\Models;

use App\Models\Concerns\AppendOnly;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * Penjualan selesai. Tidak pernah diubah; pembatalan dicatat di SaleVoid.
 *
 * @property int $id
 * @property string $number
 * @property int $cash_shift_id
 * @property int $total
 * @property int $created_by
 * @property Carbon $created_at
 */
#[Fillable(['number', 'cash_shift_id', 'total', 'created_by'])]
class Sale extends Model
{
    use AppendOnly, HasFactory;

    protected function casts(): array
    {
        return ['total' => 'integer'];
    }

    /** @return BelongsTo<CashShift, $this> */
    public function cashShift(): BelongsTo
    {
        return $this->belongsTo(CashShift::class);
    }

    /** @return BelongsTo<User, $this> */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return HasMany<SaleItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** @return HasOne<SaleVoid, $this> */
    public function void(): HasOne
    {
        return $this->hasOne(SaleVoid::class);
    }

    public function isVoided(): bool
    {
        return $this->void()->exists();
    }
}
