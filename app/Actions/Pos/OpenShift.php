<?php

namespace App\Actions\Pos;

use App\Actions\Activity\LogActivity;
use App\Exceptions\PosException;
use App\Models\CashShift;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OpenShift
{
    public function __construct(private LogActivity $logActivity) {}

    /** Buka shift baru. Satu kasir hanya boleh punya satu shift aktif. */
    public function handle(User $user, int $openingCash): CashShift
    {
        if ($openingCash < 0) {
            throw PosException::invalid('Kas awal tidak boleh negatif.');
        }

        return DB::transaction(function () use ($user, $openingCash) {
            // Kunci baris pengguna agar dua permintaan bersamaan tidak membuka dua shift.
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if (CashShift::activeFor($user) !== null) {
                throw PosException::invalid('Anda masih punya shift yang aktif. Tutup dulu sebelum membuka yang baru.');
            }

            $shift = CashShift::create([
                'user_id' => $user->id,
                'opened_at' => now(),
                'opening_cash' => $openingCash,
            ]);

            $this->logActivity->handle('shift.opened', $shift, ['opening_cash' => $openingCash], $user->id);

            return $shift;
        });
    }
}
