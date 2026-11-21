<?php

namespace App\Models;

use App\Models\Concerns\AppendOnly;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Baris penjualan: salinan nama, satuan, isi, dan harga saat transaksi.
 *
 * @property int $id
 * @property int $sale_id
 * @property int $product_id
 * @property int $product_unit_id
 * @property string $product_name
 * @property string $unit_name
 * @property int $conversion
 * @property int $qty
 * @property int $base_qty
 * @property int $unit_price
 * @property int $line_total
 */
#[Fillable([
    'sale_id', 'product_id', 'product_unit_id', 'product_name', 'unit_name',
    'conversion', 'qty', 'base_qty', 'unit_price', 'line_total',
])]
class SaleItem extends Model
{
    use AppendOnly, HasFactory;

    protected function casts(): array
    {
        return [
            'conversion' => 'integer',
            'qty' => 'integer',
            'base_qty' => 'integer',
            'unit_price' => 'integer',
            'line_total' => 'integer',
        ];
    }

    /** @return BelongsTo<Sale, $this> */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    /** @return HasMany<StockMovement, $this> */
    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
