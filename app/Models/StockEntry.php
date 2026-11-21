<?php

namespace App\Models;

use App\Models\Concerns\AppendOnly;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Catatan penerimaan barang. Tanpa saldo; stok ada di StockMovement.
 *
 * @property int $id
 * @property string $number
 * @property string|null $supplier_name
 * @property string|null $note
 * @property Carbon $occurred_at
 */
#[Fillable(['number', 'supplier_name', 'note', 'occurred_at', 'created_by'])]
class StockEntry extends Model
{
    use AppendOnly;

    protected function casts(): array
    {
        return ['occurred_at' => 'datetime'];
    }

    /** @return HasMany<StockMovement, $this> */
    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
