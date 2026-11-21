<?php

namespace App\Models;

use App\Enums\MemberStatus;
use App\Enums\SavingsType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Anggota koperasi. Tidak punya kolom saldo: saldo dibaca dari savings_ledger.
 *
 * @property int $id
 * @property string $member_number
 * @property string $name
 * @property string|null $phone
 * @property string|null $address
 * @property Carbon $joined_at
 * @property MemberStatus $status
 * @property Carbon|null $exited_at
 */
#[Fillable(['member_number', 'name', 'phone', 'address', 'joined_at', 'status', 'exited_at'])]
class Member extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'joined_at' => 'date',
            'exited_at' => 'date',
            'status' => MemberStatus::class,
        ];
    }

    public function isActive(): bool
    {
        return $this->status === MemberStatus::Active;
    }

    /**
     * @param  Builder<Member>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', MemberStatus::Active);
    }

    /** @return HasMany<SavingsEntry, $this> */
    public function savings(): HasMany
    {
        return $this->hasMany(SavingsEntry::class);
    }

    /** Saldo satu jenis simpanan: balance_after baris terakhir (0 bila belum ada). */
    public function balance(SavingsType $type): int
    {
        return (int) ($this->savings()
            ->where('savings_type', $type)
            ->orderByDesc('id')
            ->value('balance_after') ?? 0);
    }

    /** @return array<string, int> saldo per jenis, kunci = nilai enum */
    public function balances(): array
    {
        return static::balancesFor(collect([$this->id]))[$this->id];
    }

    /**
     * Saldo banyak anggota sekaligus (satu query), untuk daftar.
     *
     * @param  Collection<int, int>  $memberIds
     * @return array<int, array<string, int>> member_id => [jenis => saldo]
     */
    public static function balancesFor(Collection $memberIds): array
    {
        $result = [];
        foreach ($memberIds as $id) {
            $result[$id] = array_fill_keys(array_column(SavingsType::cases(), 'value'), 0);
        }

        if ($memberIds->isEmpty()) {
            return $result;
        }

        $latest = SavingsEntry::query()
            ->whereIn('id', function ($q) use ($memberIds) {
                $q->selectRaw('MAX(id)')
                    ->from('savings_ledger')
                    ->whereIn('member_id', $memberIds->all())
                    ->groupBy('member_id', 'savings_type');
            })
            ->get(['member_id', 'savings_type', 'balance_after']);

        foreach ($latest as $row) {
            $result[$row->member_id][$row->savings_type->value] = $row->balance_after;
        }

        return $result;
    }
}
