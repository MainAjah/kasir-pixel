<?php

namespace App\Models;

use App\Enums\SavingsEntryType;
use App\Enums\SavingsType;
use App\Models\Concerns\AppendOnly;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * Baris ledger simpanan. Ditulis hanya lewat App\Actions\Savings\PostSaving.
 * Hanya bisa ditambah (dijaga di model; tanpa trigger database).
 *
 * @property int $id
 * @property string $number
 * @property int $member_id
 * @property SavingsType $savings_type
 * @property SavingsEntryType $entry_type
 * @property int $amount
 * @property int $balance_after
 * @property Carbon|null $period
 * @property int|null $reverses_entry_id
 * @property string|null $note
 * @property Carbon $occurred_at
 */
#[Fillable([
    'number', 'member_id', 'savings_type', 'entry_type', 'amount', 'balance_after',
    'period', 'reverses_entry_id', 'note', 'occurred_at', 'created_by',
])]
class SavingsEntry extends Model
{
    use AppendOnly;

    protected $table = 'savings_ledger';

    protected function casts(): array
    {
        return [
            'savings_type' => SavingsType::class,
            'entry_type' => SavingsEntryType::class,
            'amount' => 'integer',
            'balance_after' => 'integer',
            'period' => 'date',
            'occurred_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Member, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class)->withTrashed();
    }

    /** Baris pembalik untuk baris ini, bila sudah dibalik. @return HasOne<SavingsEntry, $this> */
    public function reversedBy(): HasOne
    {
        return $this->hasOne(self::class, 'reverses_entry_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
