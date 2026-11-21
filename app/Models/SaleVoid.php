<?php

namespace App\Models;

use App\Models\Concerns\AppendOnly;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pembatalan penjualan. Satu penjualan hanya bisa dibatalkan sekali (sale_id unik).
 *
 * @property int $id
 * @property int $sale_id
 * @property string $reason
 * @property int $created_by
 */
#[Fillable(['sale_id', 'reason', 'created_by'])]
class SaleVoid extends Model
{
    use AppendOnly;

    /** @return BelongsTo<Sale, $this> */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
