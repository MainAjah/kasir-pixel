<?php

namespace App\Actions\Pos;

use App\Actions\Activity\LogActivity;
use App\Exceptions\PosException;
use App\Models\CashShift;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CloseShift
{
    public function __construct(private LogActivity $logActivity) {}

    /**
     * Tutup shift: hitung uang yang seharusnya ada, bandingkan dengan hitungan fisik,
     * lalu bekukan. Hanya pemilik shift, hanya sekali.
     */
    public function handle(CashShift $shift, User $by, int $countedCash, ?string $note = null): CashShift
    {
        if ($countedCash < 0) {
            throw PosException::invalid('Uang hitung tidak boleh negatif.');
        }

        return DB::transaction(function () use ($shift, $by, $countedCash, $note) {
            $locked = CashShift::whereKey($shift->id)->lockForUpdate()->firstOrFail();

            if ($locked->user_id !== $by->id) {
                throw PosException::invalid('Hanya pemilik shift yang boleh menutupnya.');
            }

            if (! $locked->isOpen()) {
                throw PosException::invalid('Shift ini sudah ditutup.');
            }

            $expected = $locked->computeExpectedCash();
            $difference = $countedCash - $expected;
            $note = trim((string) $note) ?: null;

            if ($difference !== 0 && $note === null) {
                throw PosException::invalid('Ada selisih kas, catatan wajib diisi.');
            }

            $locked->update([
                'closed_at' => now(),
                'counted_cash' => $countedCash,
                'expected_cash' => $expected,
                'difference' => $difference,
                'closing_note' => $note,
            ]);

            $this->logActivity->handle('shift.closed', $locked, [
                'expected_cash' => $expected,
                'counted_cash' => $countedCash,
                'difference' => $difference,
            ], $by->id);

            return $locked;
        });
    }
}
