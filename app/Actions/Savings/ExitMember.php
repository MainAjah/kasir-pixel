<?php

namespace App\Actions\Savings;

use App\Actions\Activity\LogActivity;
use App\Enums\MemberStatus;
use App\Enums\SavingsType;
use App\Exceptions\SavingsException;
use App\Models\Member;
use Illuminate\Support\Facades\DB;

class ExitMember
{
    public function __construct(
        private PostSaving $postSaving,
        private LogActivity $logActivity,
    ) {}

    /**
     * Anggota keluar, satu transaksi: tarik seluruh saldo pokok, wajib, dan sukarela
     * (satu baris tarik per jenis yang saldonya lebih dari nol), lalu ubah status menjadi keluar.
     * Gagal di tengah tidak menyisakan penarikan sebagian.
     */
    public function handle(Member $member, int $userId): Member
    {
        return DB::transaction(function () use ($member, $userId) {
            $locked = Member::whereKey($member->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isActive()) {
                throw SavingsException::invalid("Anggota {$locked->member_number} sudah keluar.");
            }

            $withdrawn = [];

            foreach (SavingsType::cases() as $type) {
                $balance = $locked->balance($type);

                if ($balance > 0) {
                    $this->postSaving->withdrawForExit($locked, $type, $balance, $userId);
                    $withdrawn[$type->value] = $balance;
                }
            }

            $locked->update([
                'status' => MemberStatus::Exited,
                'exited_at' => now()->timezone(config('app.display_timezone'))->toDateString(),
            ]);

            $this->logActivity->handle('member.exited', $locked, [
                'member_number' => $locked->member_number,
                'withdrawn' => $withdrawn,
                'total' => array_sum($withdrawn),
            ], $userId);

            return $locked;
        });
    }
}
