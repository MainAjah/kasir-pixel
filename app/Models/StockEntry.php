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
 * @property int|null $supplier_id
 * @property string|null $supplier_name
 * @property string|null $note
 * @property Carbon $occurred_at
 */
#[Fillable(['number', 'supplier_id', 'supplier_name', 'note', 'occurred_at', 'created_by'])]
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

    /** Supplier dari data master (opsional, Tahap 6B). @return BelongsTo<Supplier, $this> */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class)->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
