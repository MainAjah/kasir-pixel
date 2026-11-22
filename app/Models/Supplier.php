<?php

namespace App\Models;

use Database\Factories\SupplierFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Data master supplier (Tahap 6B). Dinonaktifkan, tidak dihapus.
 *
 * @property int $id
 * @property string $name
 * @property string|null $contact
 * @property string|null $address
 * @property string|null $note
 * @property bool $is_active
 * @property int $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'contact', 'address', 'note', 'is_active', 'created_by'])]
class Supplier extends Model
{
    /** @use HasFactory<SupplierFactory> */
    use HasFactory, SoftDeletes;

    /** @var array<string, mixed> */
    protected $attributes = [
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** @return HasMany<StockEntry, $this> */
    public function stockEntries(): HasMany
    {
        return $this->hasMany(StockEntry::class);
    }
}
