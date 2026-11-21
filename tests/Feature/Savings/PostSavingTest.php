<?php

use App\Actions\Savings\PostSaving;
use App\Enums\SavingsEntryType;
use App\Enums\SavingsType;
use App\Exceptions\SavingsException;
use App\Models\ActivityLog;
use App\Models\Member;
use App\Models\SavingsEntry;
use App\Models\User;
use Illuminate\Database\QueryException;

beforeEach(function () {
    config([
        'koperasi.savings.pokok' => 100000,
        'koperasi.savings.wajib' => 25000,
        'koperasi.savings.sukarela_min' => 1000,
    ]);

    $this->user = User::factory()->create();
    $this->tz = config('app.display_timezone');
    // Anggota bergabung 3 bulan lalu, supaya tunggakan wajib bisa diuji.
    $this->member = Member::factory()->create([
        'joined_at' => now($this->tz)->subMonths(3)->startOfMonth()->toDateString(),
    ]);
    $this->post = app(PostSaving::class);
    $this->bulan = fn (int $mundur = 0) => now($this->tz)->subMonths($mundur)->startOfMonth();
});

// --- Simpanan pokok --------------------------------------------------------

test('pokok dibayar sekali sebesar tarif', function () {
    $entry = $this->post->deposit($this->member, SavingsType::Pokok, 100000, $this->user->id);

    expect($entry->amount)->toBe(100000)
        ->and($entry->balance_after)->toBe(100000)
        ->and($entry->entry_type)->toBe(SavingsEntryType::Deposit)
        ->and($entry->period)->toBeNull()
        ->and($entry->number)->toBe('SP-'.now($this->tz)->format('Ymd').'-0001')
        ->and($this->member->balance(SavingsType::Pokok))->toBe(100000);
});

test('pokok dengan nominal selain tarif ditolak, termasuk cicilan', function () {
    foreach ([99999, 50000, 100001, 200000] as $nominal) {
        expect(fn () => $this->post->deposit($this->member, SavingsType::Pokok, $nominal, $this->user->id))
            ->toThrow(SavingsException::class, 'harus sebesar');
    }

    expect(SavingsEntry::count())->toBe(0);
});

test('pokok kedua ditolak, tetapi boleh lagi setelah yang pertama dibalik', function () {
    $first = $this->post->deposit($this->member, SavingsType::Pokok, 100000, $this->user->id);

    expect(fn () => $this->post->deposit($this->member, SavingsType::Pokok, 100000, $this->user->id))
        ->toThrow(SavingsException::class, 'sudah dibayar');

    $this->post->reverse($first, $this->user->id, 'salah anggota');
    $again = $this->post->deposit($this->member, SavingsType::Pokok, 100000, $this->user->id);

    expect($again->balance_after)->toBe(100000)
        ->and($this->member->balance(SavingsType::Pokok))->toBe(100000);
});

// --- Simpanan wajib --------------------------------------------------------

test('wajib sebesar tarif untuk satu bulan', function () {
    $entry = $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)());

    expect($entry->period->format('Y-m-d'))->toBe(($this->bulan)()->toDateString())
        ->and($entry->balance_after)->toBe(25000);
});

test('tanggal pada bulan yang dipilih dinormalkan ke tanggal 1', function () {
    $entry = $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)(1)->addDays(14)->toDateString());

    expect($entry->period->format('Y-m-d'))->toBe(($this->bulan)(1)->toDateString());
});

test('wajib dengan nominal salah ditolak dan bulan wajib diisi', function () {
    expect(fn () => $this->post->deposit($this->member, SavingsType::Wajib, 20000, $this->user->id, ($this->bulan)()))
        ->toThrow(SavingsException::class, 'harus sebesar');
    expect(fn () => $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id))
        ->toThrow(SavingsException::class, 'Bulan simpanan wajib');
    expect(fn () => $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ''))
        ->toThrow(SavingsException::class, 'Bulan simpanan wajib');
});

test('wajib tidak boleh sebelum bulan bergabung atau untuk bulan depan', function () {
    expect(fn () => $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)(4)))
        ->toThrow(SavingsException::class, 'sebelum bulan anggota bergabung');
    expect(fn () => $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)(-1)))
        ->toThrow(SavingsException::class, 'belum tiba');

    // Batas: bulan bergabung dan bulan ini boleh.
    $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)(3));
    $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)(0));

    expect($this->member->balance(SavingsType::Wajib))->toBe(50000);
});

test('bulan yang sama tidak bisa dibayar dua kali, tetapi boleh lagi setelah dibalik', function () {
    $first = $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)(1));

    expect(fn () => $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)(1)))
        ->toThrow(SavingsException::class, 'sudah dibayar');

    $this->post->reverse($first, $this->user->id, 'salah bulan');
    $again = $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)(1));

    expect($again->balance_after)->toBe(25000);
});

test('beberapa bulan sekaligus menjadi beberapa baris', function () {
    foreach ([3, 2, 1, 0] as $mundur) {
        $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)($mundur));
    }

    expect($this->member->balance(SavingsType::Wajib))->toBe(100000)
        ->and(SavingsEntry::where('savings_type', 'wajib')->count())->toBe(4);
});

test('perubahan tarif tidak mengubah baris lama', function () {
    $lama = $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)(2));

    config(['koperasi.savings.wajib' => 30000]);

    expect(fn () => $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)(1)))
        ->toThrow(SavingsException::class, 'harus sebesar');

    $baru = $this->post->deposit($this->member, SavingsType::Wajib, 30000, $this->user->id, ($this->bulan)(1));

    expect($lama->fresh()->amount)->toBe(25000)
        ->and($baru->balance_after)->toBe(55000);
});

// --- Simpanan sukarela -----------------------------------------------------

test('sukarela: setor minimal, tarik tidak boleh melebihi saldo, tarik habis boleh', function () {
    expect(fn () => $this->post->deposit($this->member, SavingsType::Sukarela, 999, $this->user->id))
        ->toThrow(SavingsException::class, 'minimal');

    $this->post->deposit($this->member, SavingsType::Sukarela, 50000, $this->user->id);

    expect(fn () => $this->post->withdraw($this->member, SavingsType::Sukarela, 50001, $this->user->id))
        ->toThrow(SavingsException::class, 'tidak cukup');
    expect($this->member->balance(SavingsType::Sukarela))->toBe(50000);

    $tarik = $this->post->withdraw($this->member, SavingsType::Sukarela, 20000, $this->user->id, 'keperluan');
    expect($tarik->amount)->toBe(-20000)
        ->and($tarik->entry_type)->toBe(SavingsEntryType::Withdrawal)
        ->and($tarik->balance_after)->toBe(30000);

    $this->post->withdraw($this->member, SavingsType::Sukarela, 30000, $this->user->id);
    expect($this->member->balance(SavingsType::Sukarela))->toBe(0);
});

test('sukarela tanpa saldo tidak bisa ditarik', function () {
    expect(fn () => $this->post->withdraw($this->member, SavingsType::Sukarela, 1000, $this->user->id))
        ->toThrow(SavingsException::class, 'tidak cukup');
});

test('pokok dan wajib tidak bisa ditarik manual selama anggota aktif', function () {
    $this->post->deposit($this->member, SavingsType::Pokok, 100000, $this->user->id);
    $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)());

    foreach ([SavingsType::Pokok, SavingsType::Wajib] as $type) {
        expect(fn () => $this->post->withdraw($this->member, $type, 1000, $this->user->id))
            ->toThrow(SavingsException::class, 'proses keluar anggota');
    }

    expect($this->member->balance(SavingsType::Pokok))->toBe(100000)
        ->and($this->member->balance(SavingsType::Wajib))->toBe(25000);
});

test('jumlah nol atau negatif ditolak', function () {
    foreach ([0, -5000] as $jumlah) {
        expect(fn () => $this->post->deposit($this->member, SavingsType::Sukarela, $jumlah, $this->user->id))
            ->toThrow(SavingsException::class, 'lebih dari nol');
        expect(fn () => $this->post->withdraw($this->member, SavingsType::Sukarela, $jumlah, $this->user->id))
            ->toThrow(SavingsException::class, 'lebih dari nol');
    }
});

// --- Anggota keluar --------------------------------------------------------

test('anggota yang sudah keluar tidak bisa setor atau tarik', function () {
    $keluar = Member::factory()->exited()->create();

    expect(fn () => $this->post->deposit($keluar, SavingsType::Sukarela, 5000, $this->user->id))
        ->toThrow(SavingsException::class, 'sudah keluar');
    expect(fn () => $this->post->withdraw($keluar, SavingsType::Sukarela, 5000, $this->user->id))
        ->toThrow(SavingsException::class, 'sudah keluar');
});

// --- Ledger ----------------------------------------------------------------

test('saldo = jumlah amount = balance_after terakhir per jenis, dan jenis saling bebas', function () {
    $this->post->deposit($this->member, SavingsType::Sukarela, 40000, $this->user->id);
    $this->post->deposit($this->member, SavingsType::Pokok, 100000, $this->user->id);
    $this->post->withdraw($this->member, SavingsType::Sukarela, 15000, $this->user->id);
    $this->post->deposit($this->member, SavingsType::Sukarela, 5000, $this->user->id);
    $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->user->id, ($this->bulan)());

    foreach (SavingsType::cases() as $type) {
        $sum = (int) SavingsEntry::where('member_id', $this->member->id)->where('savings_type', $type)->sum('amount');
        $last = SavingsEntry::where('member_id', $this->member->id)->where('savings_type', $type)->orderByDesc('id')->value('balance_after');

        expect($last)->toBe($sum)->and($this->member->balance($type))->toBe($sum);
    }

    expect($this->member->balances())->toBe(['pokok' => 100000, 'wajib' => 25000, 'sukarela' => 30000]);
});

test('rantai balance_after konsisten dari baris ke baris', function () {
    $this->post->deposit($this->member, SavingsType::Sukarela, 10000, $this->user->id);
    $this->post->deposit($this->member, SavingsType::Sukarela, 7000, $this->user->id);
    $this->post->withdraw($this->member, SavingsType::Sukarela, 4000, $this->user->id);

    $running = 0;
    foreach (SavingsEntry::where('savings_type', 'sukarela')->orderBy('id')->get() as $row) {
        $running += $row->amount;
        expect($row->balance_after)->toBe($running);
    }
});

test('saldo banyak anggota dibaca sekaligus dengan benar', function () {
    $lain = Member::factory()->create();
    $this->post->deposit($this->member, SavingsType::Sukarela, 10000, $this->user->id);
    $this->post->deposit($lain, SavingsType::Sukarela, 3000, $this->user->id);
    $this->post->deposit($lain, SavingsType::Sukarela, 2000, $this->user->id);
    $kosong = Member::factory()->create();

    $saldo = Member::balancesFor(collect([$this->member->id, $lain->id, $kosong->id]));

    expect($saldo[$this->member->id]['sukarela'])->toBe(10000)
        ->and($saldo[$lain->id]['sukarela'])->toBe(5000)
        ->and($saldo[$kosong->id])->toBe(['pokok' => 0, 'wajib' => 0, 'sukarela' => 0]);
});

test('model ledger menolak update dan delete lewat Eloquent', function () {
    // Perlindungan hanya di model; query langsung tidak dijaga dan tidak diuji (tanpa trigger).
    $entry = $this->post->deposit($this->member, SavingsType::Sukarela, 5000, $this->user->id);

    expect(fn () => $entry->update(['amount' => 1]))->toThrow(LogicException::class);
    expect(fn () => $entry->delete())->toThrow(LogicException::class);

    expect(SavingsEntry::find($entry->id)->amount)->toBe(5000);
});

test('database menolak amount nol dan dua pembalik untuk baris yang sama', function () {
    $entry = $this->post->deposit($this->member, SavingsType::Sukarela, 5000, $this->user->id);

    $baris = fn (array $override) => SavingsEntry::create(array_merge([
        'number' => 'SP-X-'.uniqid(),
        'member_id' => $this->member->id,
        'savings_type' => SavingsType::Sukarela,
        'entry_type' => SavingsEntryType::Reversal,
        'amount' => -1000,
        'balance_after' => 4000,
        'occurred_at' => now(),
        'created_by' => $this->user->id,
    ], $override));

    expect(fn () => $baris(['amount' => 0]))->toThrow(QueryException::class);

    $baris(['reverses_entry_id' => $entry->id]);
    expect(fn () => $baris(['reverses_entry_id' => $entry->id]))->toThrow(QueryException::class);
});

test('nomor SP berurutan per hari', function () {
    $a = $this->post->deposit($this->member, SavingsType::Sukarela, 5000, $this->user->id);
    $b = $this->post->deposit($this->member, SavingsType::Sukarela, 5000, $this->user->id);

    $prefix = 'SP-'.now($this->tz)->format('Ymd').'-';

    expect($a->number)->toBe($prefix.'0001')->and($b->number)->toBe($prefix.'0002');
});

// --- Pembalikan ------------------------------------------------------------

test('membalik setoran mengurangi saldo dan mencatat baris pembalik', function () {
    $setor = $this->post->deposit($this->member, SavingsType::Sukarela, 30000, $this->user->id);

    $balik = $this->post->reverse($setor, $this->user->id, 'salah input');

    expect($balik->entry_type)->toBe(SavingsEntryType::Reversal)
        ->and($balik->amount)->toBe(-30000)
        ->and($balik->balance_after)->toBe(0)
        ->and($balik->reverses_entry_id)->toBe($setor->id)
        ->and($balik->note)->toBe('salah input')
        ->and($balik->savings_type)->toBe(SavingsType::Sukarela);
});

test('membalik penarikan mengembalikan saldo', function () {
    $this->post->deposit($this->member, SavingsType::Sukarela, 30000, $this->user->id);
    $tarik = $this->post->withdraw($this->member, SavingsType::Sukarela, 10000, $this->user->id);

    $balik = $this->post->reverse($tarik, $this->user->id, 'batal tarik');

    expect($balik->amount)->toBe(10000)->and($balik->balance_after)->toBe(30000);
});

test('baris hanya bisa dibalik sekali dan pembalik tidak bisa dibalik', function () {
    $setor = $this->post->deposit($this->member, SavingsType::Sukarela, 30000, $this->user->id);
    $balik = $this->post->reverse($setor, $this->user->id, 'salah');

    expect(fn () => $this->post->reverse($setor, $this->user->id, 'lagi'))->toThrow(SavingsException::class, 'sudah pernah dibalik');
    expect(fn () => $this->post->reverse($balik, $this->user->id, 'balik lagi'))->toThrow(SavingsException::class, 'tidak bisa dibalik');

    expect(SavingsEntry::count())->toBe(2);
});

test('alasan pembalikan wajib', function () {
    $setor = $this->post->deposit($this->member, SavingsType::Sukarela, 30000, $this->user->id);

    foreach (['', '   '] as $kosong) {
        expect(fn () => $this->post->reverse($setor, $this->user->id, $kosong))->toThrow(SavingsException::class, 'Alasan');
    }

    expect(SavingsEntry::count())->toBe(1);
});

test('pembalikan yang membuat saldo minus ditolak', function () {
    $setor = $this->post->deposit($this->member, SavingsType::Sukarela, 30000, $this->user->id);
    $this->post->withdraw($this->member, SavingsType::Sukarela, 25000, $this->user->id);

    expect(fn () => $this->post->reverse($setor, $this->user->id, 'salah'))
        ->toThrow(SavingsException::class, 'tidak cukup');

    expect($this->member->balance(SavingsType::Sukarela))->toBe(5000);
});

test('pembalikan tercatat di activity_logs', function () {
    $setor = $this->post->deposit($this->member, SavingsType::Sukarela, 30000, $this->user->id);
    $balik = $this->post->reverse($setor, $this->user->id, 'salah input');

    $log = ActivityLog::where('action', 'savings.reversed')->firstOrFail();

    expect($log->user_id)->toBe($this->user->id)
        ->and($log->properties)->toMatchArray(['number' => $balik->number, 'reverses' => $setor->number, 'reason' => 'salah input']);
});

test('pembalikan tetap bisa untuk anggota yang sudah keluar (koreksi)', function () {
    $setor = $this->post->deposit($this->member, SavingsType::Sukarela, 30000, $this->user->id);
    $this->post->withdraw($this->member, SavingsType::Sukarela, 30000, $this->user->id);
    $this->member->update(['status' => 'exited', 'exited_at' => now($this->tz)->toDateString()]);
    $tarik = SavingsEntry::where('entry_type', 'withdrawal')->firstOrFail();

    $balik = $this->post->reverse($tarik, $this->user->id, 'koreksi setelah keluar');

    expect($balik->balance_after)->toBe(30000);
});
