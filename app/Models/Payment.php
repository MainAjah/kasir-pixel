<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Models\Concerns\AppendOnly;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $sale_id
 * @property PaymentMethod $method
 * @property int $amount
 * @property int $tendered
 * @property int $change
 */
#[Fillable(['sale_id', 'method', 'amount', 'tendered', 'change'])]
class Payment extends Model
{
    use AppendOnly;

    protected function casts(): array
    {
        return [
            'method' => PaymentMethod::class,
            'amount' => 'integer',
            'tendered' => 'integer',
            'change' => 'integer',
        ];
    }

    /** @return BelongsTo<Sale, $this> */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
