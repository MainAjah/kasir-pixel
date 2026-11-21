<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $product_id
 * @property string $name
 * @property int $conversion
 * @property bool $is_base
 * @property int $sell_price
 * @property string|null $barcode
 */
#[Fillable(['product_id', 'name', 'conversion', 'is_base', 'sell_price', 'barcode'])]
class ProductUnit extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'conversion' => 'integer',
            'is_base' => 'boolean',
            'sell_price' => 'integer',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Satuan dianggap terpakai bila sudah muncul di ledger stok.
     * Tahap 3 menambahkan pengecekan sale_items di sini.
     */
    public function isInUse(): bool
    {
        return StockMovement::where('input_unit_id', $this->id)->exists();
    }
}
