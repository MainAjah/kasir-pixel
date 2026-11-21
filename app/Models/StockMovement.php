<?php

namespace App\Models;

use App\Enums\StockMovementType;
use App\Models\Concerns\AppendOnly;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ledger stok. Ditulis hanya lewat App\Actions\Inventory\AdjustStock.
 *
 * @property int $id
 * @property int $product_id
 * @property StockMovementType $type
 * @property int $qty
 * @property int $balance_after
 * @property int $input_unit_id
 * @property int $input_qty
 * @property int|null $reverses_movement_id
 */
#[Fillable([
    'product_id', 'type', 'qty', 'balance_after', 'input_unit_id', 'input_qty',
    'cost_total', 'stock_entry_id', 'sale_item_id', 'reverses_movement_id',
    'note', 'occurred_at', 'created_by',
])]
class StockMovement extends Model
{
    use AppendOnly;

    protected function casts(): array
    {
        return [
            'type' => StockMovementType::class,
            'qty' => 'integer',
            'balance_after' => 'integer',
            'input_qty' => 'integer',
            'cost_total' => 'integer',
            'occurred_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /** @return BelongsTo<ProductUnit, $this> */
    public function inputUnit(): BelongsTo
    {
        return $this->belongsTo(ProductUnit::class, 'input_unit_id')->withTrashed();
    }

    /** @return BelongsTo<StockEntry, $this> */
    public function stockEntry(): BelongsTo
    {
        return $this->belongsTo(StockEntry::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
