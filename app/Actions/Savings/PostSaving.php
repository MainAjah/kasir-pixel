<?php

namespace App\Actions\Savings;

use App\Actions\Activity\LogActivity;
use App\Enums\SavingsEntryType;
use App\Enums\SavingsType;
use App\Exceptions\SavingsException;
use App\Models\Member;
use App\Models\SavingsEntry;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Satu-satunya pintu penulisan ke ledger simpanan (savings_ledger).
 *
 * Aturan (docs/skema.md bagian 5, asumsi S1-S8 di rencana Tahap 4):
 *  - saldo = balance_after baris terakhir per anggota per jenis, tidak pernah minus;
 *  - pokok: sekali, sebesar tarif; wajib: satu bulan per setoran sebesar tarif; sukarela bebas;
 *  - pokok dan wajib tidak bisa ditarik manual, hanya lewat ExitMember (withdrawForExit);
 *  - anggota yang sudah keluar tidak bisa setor atau tarik, hanya dibalik;
 *  - koreksi lewat baris pembalik (reverse), bukan edit.
 *
 * Perlindungan hanya di aplikasi (model AppendOnly + pintu ini); tidak ada trigger database.
 */
class PostSaving
{
    public function __construct(private LogActivity $logActivity) {}

    /** Setor. Untuk wajib, $period = bulan yang dibayar (tanggal bebas, dipakai bulannya). */
    public function deposit(
        Member $member,
        SavingsType $type,
        int $amount,
        int $userId,
        CarbonInterface|string|null $period = null,
        ?string $note = null,
    ): SavingsEntry {
        return DB::transaction(function () use ($member, $type, $amount, $userId, $period, $note) {
            $locked = $this->lockActiveMember($member);
            $this->requirePositive($amount);

            $periodDate = $this->validateDeposit($locked, $type, $amount, $period);

            return $this->insert($locked, $type, SavingsEntryType::Deposit, $amount, $userId, $periodDate, null, $note);
        });
    }

    /** Tarik manual. Hanya simpanan sukarela, tidak boleh melebihi saldo. */
    public function withdraw(
        Member $member,
        SavingsType $type,
        int $amount,
        int $userId,
        ?string $note = null,
    ): SavingsEntry {
        return DB::transaction(function () use ($member, $type, $amount, $userId, $note) {
            $locked = $this->lockActiveMember($member);
            $this->requirePositive($amount);

            if ($type !== SavingsType::Sukarela) {
                throw SavingsException::invalid("{$type->label()} tidak bisa ditarik selama anggota masih aktif; hanya lewat proses keluar anggota.");
            }

            return $this->insert($locked, $type, SavingsEntryType::Withdrawal, -$amount, $userId, null, null, $note);
        });
    }

    /**
     * Penarikan penuh saat anggota keluar. Hanya dipanggil ExitMember, di dalam transaksinya
     * dan sebelum status anggota diubah. Boleh menarik pokok dan wajib.
     */
    public function withdrawForExit(Member $member, SavingsType $type, int $amount, int $userId): SavingsEntry
    {
        return DB::transaction(function () use ($member, $type, $amount, $userId) {
            $locked = $this->lockActiveMember($member);
            $this->requirePositive($amount);

            return $this->insert($locked, $type, SavingsEntryType::Withdrawal, -$amount, $userId, null, null, 'Keluar anggota');
        });
    }

    /**
     * Balik satu baris dengan baris baru berlawanan tanda. Alasan wajib. Satu baris hanya sekali,
     * baris pembalik tidak bisa dibalik lagi, dan hasilnya tidak boleh membuat saldo minus.
     * Boleh untuk anggota yang sudah keluar (koreksi). Membalik setoran pokok atau wajib
     * membebaskan lagi pokok atau bulan itu.
     */
    public function reverse(SavingsEntry $original, int $userId, string $reason): SavingsEntry
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw SavingsException::invalid('Alasan pembalikan wajib diisi.');
        }

        return DB::transaction(function () use ($original, $userId, $reason) {
            $member = Member::whereKey($original->member_id)->lockForUpdate()->firstOrFail();

            if ($original->entry_type === SavingsEntryType::Reversal) {
                throw SavingsException::invalid('Baris pembalik tidak bisa dibalik lagi.');
            }
            if (SavingsEntry::where('reverses_entry_id', $original->id)->exists()) {
                throw SavingsException::invalid('Baris ini sudah pernah dibalik.');
            }

            $entry = $this->insert(
                $member,
                $original->savings_type,
                SavingsEntryType::Reversal,
                -$original->amount,
                $userId,
                $original->period,
                $original,
                $reason,
            );

            $this->logActivity->handle('savings.reversed', $member, [
                'number' => $entry->number,
                'reverses' => $original->number,
                'type' => $original->savings_type->value,
                'amount' => $entry->amount,
                'reason' => $reason,
            ], $userId);

            return $entry;
        });
    }

    private function lockActiveMember(Member $member): Member
    {
        $locked = Member::whereKey($member->id)->lockForUpdate()->firstOrFail();

        if (! $locked->isActive()) {
            throw SavingsException::invalid("Anggota {$locked->member_number} sudah keluar; tidak bisa setor atau tarik.");
        }

        return $locked;
    }

    private function requirePositive(int $amount): void
    {
        if ($amount <= 0) {
            throw SavingsException::invalid('Jumlah harus lebih dari nol.');
        }
    }

    /** Validasi aturan setoran per jenis. Mengembalikan tanggal bulan (untuk wajib) atau null. */
    private function validateDeposit(Member $member, SavingsType $type, int $amount, CarbonInterface|string|null $period): ?string
    {
        return match ($type) {
            SavingsType::Pokok => $this->validatePokok($member, $amount),
            SavingsType::Wajib => $this->validateWajib($member, $amount, $period),
            SavingsType::Sukarela => $this->validateSukarela($amount),
        };
    }

    private function validatePokok(Member $member, int $amount): ?string
    {
        $rate = (int) config('koperasi.savings.pokok');

        if ($amount !== $rate) {
            throw SavingsException::invalid('Simpanan pokok harus sebesar Rp '.number_format($rate, 0, ',', '.').' (dibayar sekali, tidak dicicil).');
        }

        $alreadyPaid = SavingsEntry::query()
            ->where('member_id', $member->id)
            ->where('savings_type', SavingsType::Pokok)
            ->where('entry_type', SavingsEntryType::Deposit)
            ->whereDoesntHave('reversedBy')
            ->exists();

        if ($alreadyPaid) {
            throw SavingsException::invalid('Simpanan pokok anggota ini sudah dibayar.');
        }

        return null;
    }

    private function validateWajib(Member $member, int $amount, CarbonInterface|string|null $period): string
    {
        $rate = (int) config('koperasi.savings.wajib');

        if ($amount !== $rate) {
            throw SavingsException::invalid('Simpanan wajib harus sebesar Rp '.number_format($rate, 0, ',', '.').' per bulan.');
        }
        if ($period === null || $period === '') {
            throw SavingsException::invalid('Bulan simpanan wajib harus diisi.');
        }

        $tz = config('app.display_timezone');
        $month = Carbon::parse($period instanceof CarbonInterface ? $period->toDateString() : $period, $tz)->startOfMonth();

        if ($month->format('Y-m') < $member->joined_at->format('Y-m')) {
            throw SavingsException::invalid('Bulan simpanan wajib tidak boleh sebelum bulan anggota bergabung.');
        }
        if ($month->format('Y-m') > now($tz)->format('Y-m')) {
            throw SavingsException::invalid('Simpanan wajib tidak bisa dibayar untuk bulan yang belum tiba.');
        }

        $label = $month->format('m/Y');
        $dateString = $month->toDateString();

        $alreadyPaid = SavingsEntry::query()
            ->where('member_id', $member->id)
            ->where('savings_type', SavingsType::Wajib)
            ->where('entry_type', SavingsEntryType::Deposit)
            ->where('period', $dateString)
            ->whereDoesntHave('reversedBy')
            ->exists();

        if ($alreadyPaid) {
            throw SavingsException::invalid("Simpanan wajib bulan {$label} sudah dibayar.");
        }

        return $dateString;
    }

    private function validateSukarela(int $amount): ?string
    {
        $min = (int) config('koperasi.savings.sukarela_min');

        if ($amount < $min) {
            throw SavingsException::invalid('Setoran sukarela minimal Rp '.number_format($min, 0, ',', '.').'.');
        }

        return null;
    }

    /**
     * Tulis satu baris. Dipanggil di dalam transaksi dengan baris anggota sudah terkunci,
     * sehingga saldo terakhir yang dibaca tidak berubah sebelum insert.
     */
    private function insert(
        Member $member,
        SavingsType $type,
        SavingsEntryType $entryType,
        int $signedAmount,
        int $userId,
        CarbonInterface|string|null $period,
        ?SavingsEntry $reverses,
        ?string $note,
    ): SavingsEntry {
        $previous = (int) (SavingsEntry::where('member_id', $member->id)
            ->where('savings_type', $type)
            ->orderByDesc('id')
            ->value('balance_after') ?? 0);

        $balanceAfter = $previous + $signedAmount;

        if ($balanceAfter < 0) {
            throw SavingsException::invalid(
                'Saldo '.mb_strtolower($type->label()).' tidak cukup: tersedia Rp '.number_format($previous, 0, ',', '.')
                .', diminta Rp '.number_format(abs($signedAmount), 0, ',', '.').'.'
            );
        }

        return SavingsEntry::create([
            'number' => $this->nextNumber(),
            'member_id' => $member->id,
            'savings_type' => $type,
            'entry_type' => $entryType,
            'amount' => $signedAmount,
            'balance_after' => $balanceAfter,
            'period' => $period,
            'reverses_entry_id' => $reverses?->id,
            'note' => $note,
            'occurred_at' => now(),
            'created_by' => $userId,
        ]);
    }

    /** Nomor SP-yyyymmdd-nnnn: urut per hari (tanggal WIB), dihitung di dalam transaksi. */
    private function nextNumber(): string
    {
        $prefix = 'SP-'.now()->timezone(config('app.display_timezone'))->format('Ymd').'-';

        $last = SavingsEntry::where('number', 'like', $prefix.'%')
            ->orderByDesc('number')
            ->lockForUpdate()
            ->value('number');

        $next = $last === null ? 1 : ((int) substr($last, strlen($prefix))) + 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
