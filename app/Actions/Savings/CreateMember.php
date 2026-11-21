<?php

namespace App\Actions\Savings;

use App\Actions\Activity\LogActivity;
use App\Enums\MemberStatus;
use App\Exceptions\SavingsException;
use App\Models\Member;
use Illuminate\Support\Facades\DB;

class CreateMember
{
    public function __construct(private LogActivity $logActivity) {}

    /**
     * Daftarkan anggota baru. Nomor A-000001, A-000002, ... dibuat di dalam transaksi
     * dari nomor terbesar yang pernah ada, termasuk anggota yang di-soft-delete,
     * sehingga nomor tidak pernah dipakai ulang. Pendaftaran tidak otomatis menyetor pokok.
     *
     * @param  array{name: string, phone?: string|null, address?: string|null, joined_at?: string|null}  $data
     */
    public function handle(array $data, int $userId): Member
    {
        $name = trim($data['name'] ?? '');
        if ($name === '') {
            throw SavingsException::invalid('Nama anggota wajib diisi.');
        }

        $today = now()->timezone(config('app.display_timezone'))->toDateString();
        $joinedAt = ($data['joined_at'] ?? null) ?: $today;

        if ($joinedAt > $today) {
            throw SavingsException::invalid('Tanggal bergabung tidak boleh di masa depan.');
        }

        return DB::transaction(function () use ($data, $name, $joinedAt, $userId) {
            $member = Member::create([
                'member_number' => $this->nextNumber(),
                'name' => $name,
                'phone' => trim((string) ($data['phone'] ?? '')) ?: null,
                'address' => trim((string) ($data['address'] ?? '')) ?: null,
                'joined_at' => $joinedAt,
                'status' => MemberStatus::Active,
            ]);

            $this->logActivity->handle('member.created', $member, [
                'member_number' => $member->member_number,
                'name' => $member->name,
            ], $userId);

            return $member;
        });
    }

    private function nextNumber(): string
    {
        $last = Member::withTrashed()
            ->orderByDesc('member_number')
            ->lockForUpdate()
            ->value('member_number');

        $next = $last === null ? 1 : ((int) substr($last, 2)) + 1;

        return 'A-'.str_pad((string) $next, 6, '0', STR_PAD_LEFT);
    }
}
