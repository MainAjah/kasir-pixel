<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $sku
 * @property string $name
 * @property int|null $category_id
 * @property string|null $image_path Berkas gambar di disk "public" (lihat SetProductImage).
 * @property int $min_stock
 * @property bool $is_active
 * @property int|null $stock Terisi bila memakai scope withStock().
 */
#[Fillable(['sku', 'name', 'category_id', 'min_stock', 'is_active'])]
class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'min_stock' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return HasMany<ProductUnit, $this> */
    public function units(): HasMany
    {
        return $this->hasMany(ProductUnit::class);
    }

    /** @return HasOne<ProductUnit, $this> */
    public function baseUnit(): HasOne
    {
        return $this->hasOne(ProductUnit::class)->where('is_base', true);
    }

    /** @return HasMany<StockMovement, $this> */
    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * Tambahkan kolom `stock`: balance_after dari mutasi terakhir (0 bila belum ada).
     *
     * @param  Builder<Product>  $query
     */
    public function scopeWithStock(Builder $query): void
    {
        $query->addSelect([
            'stock' => StockMovement::query()
                ->select('balance_after')
                ->whereColumn('product_id', 'products.id')
                ->orderByDesc('id')
                ->limit(1),
        ])->withCasts(['stock' => 'integer']);
    }

    /**
     * Hanya produk yang stoknya sudah di bawah atau sama dengan stok minimum.
     *
     * @param  Builder<Product>  $query
     */
    public function scopeLowStock(Builder $query): void
    {
        $query->whereRaw(
            'COALESCE((select balance_after from stock_movements where product_id = products.id order by id desc limit 1), 0) <= products.min_stock'
        );
    }

    /** Alamat gambar barang (relatif ke situs, ikut host yang dipakai), null bila belum ada. */
    public function imageUrl(): ?string
    {
        return $this->image_path ? '/storage/'.$this->image_path : null;
    }

    /** Stok terkini dari ledger (satu query). */
    public function currentStock(): int
    {
        return (int) ($this->movements()->orderByDesc('id')->value('balance_after') ?? 0);
    }

    public function hasMovements(): bool
    {
        return $this->movements()->exists();
    }
}
