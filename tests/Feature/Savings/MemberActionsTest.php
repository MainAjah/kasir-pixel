<?php

use App\Actions\Savings\CreateMember;
use App\Actions\Savings\ExitMember;
use App\Actions\Savings\PostSaving;
use App\Actions\Savings\UpdateMember;
use App\Enums\MemberStatus;
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
    $this->create = app(CreateMember::class);
    $this->post = app(PostSaving::class);
    $this->exit = app(ExitMember::class);
});

// --- Pendaftaran -----------------------------------------------------------

test('anggota baru bernomor A-000001 berurutan, aktif, dan bergabung hari ini', function () {
    $a = $this->create->handle(['name' => 'Siti', 'phone' => '0812', 'address' => 'Jl. Mawar 1'], $this->user->id);
    $b = $this->create->handle(['name' => 'Budi'], $this->user->id);

    expect($a->member_number)->toBe('A-000001')
        ->and($b->member_number)->toBe('A-000002')
        ->and($a->status)->toBe(MemberStatus::Active)
        ->and($a->joined_at->toDateString())->toBe(now($this->tz)->toDateString())
        ->and($a->phone)->toBe('0812')
        ->and($b->phone)->toBeNull()
        ->and(ActivityLog::where('action', 'member.created')->count())->toBe(2);
});

test('nomor anggota tidak dipakai ulang setelah anggota dihapus (soft delete)', function () {
    $a = $this->create->handle(['name' => 'Siti'], $this->user->id);
    $b = $this->create->handle(['name' => 'Budi'], $this->user->id);
    $b->delete();

    $c = $this->create->handle(['name' => 'Cici'], $this->user->id);

    expect($b->member_number)->toBe('A-000002')
        ->and($c->member_number)->toBe('A-000003')
        ->and(Member::withTrashed()->pluck('member_number')->all())->toBe(['A-000001', 'A-000002', 'A-000003'])
        ->and($a->member_number)->toBe('A-000001');
});

test('nomor anggota tidak dipakai ulang setelah anggota keluar', function () {
    $a = $this->create->handle(['name' => 'Siti'], $this->user->id);
    $this->exit->handle($a, $this->user->id);

    $b = $this->create->handle(['name' => 'Budi'], $this->user->id);

    expect($b->member_number)->toBe('A-000002');
});

test('nomor anggota unik di database', function () {
    $a = $this->create->handle(['name' => 'Siti'], $this->user->id);

    expect(fn () => Member::factory()->create(['member_number' => $a->member_number]))
        ->toThrow(QueryException::class);
});

test('nama wajib dan tanggal bergabung tidak boleh di masa depan', function () {
    expect(fn () => $this->create->handle(['name' => '   '], $this->user->id))->toThrow(SavingsException::class, 'Nama');
    expect(fn () => $this->create->handle(['name' => 'Siti', 'joined_at' => now($this->tz)->addDay()->toDateString()], $this->user->id))
        ->toThrow(SavingsException::class, 'masa depan');

    expect(Member::count())->toBe(0);
});

test('tanggal bergabung di masa lalu boleh', function () {
    $m = $this->create->handle(['name' => 'Siti', 'joined_at' => '2026-01-15'], $this->user->id);

    expect($m->joined_at->toDateString())->toBe('2026-01-15');
});

// --- Ubah data -------------------------------------------------------------

test('ubah nama dan kontak tercatat di log; nomor, tanggal, dan status tidak berubah', function () {
    $m = $this->create->handle(['name' => 'Siti', 'phone' => '0812'], $this->user->id);
    $nomor = $m->member_number;
    $joined = $m->joined_at->toDateString();

    app(UpdateMember::class)->handle($m, [
        'name' => 'Siti Aminah', 'phone' => '0899', 'address' => 'Jl. Baru',
        // Isian yang seharusnya diabaikan:
        'member_number' => 'A-999999', 'status' => 'exited', 'joined_at' => '2000-01-01',
    ], $this->user->id);

    $fresh = $m->fresh();
    $log = ActivityLog::where('action', 'member.updated')->firstOrFail();

    expect($fresh->name)->toBe('Siti Aminah')
        ->and($fresh->phone)->toBe('0899')
        ->and($fresh->member_number)->toBe($nomor)
        ->and($fresh->status)->toBe(MemberStatus::Active)
        ->and($fresh->joined_at->toDateString())->toBe($joined)
        ->and($log->properties)->toHaveKeys(['name', 'phone', 'address']);
});

test('ubah tanpa perubahan tidak membuat log', function () {
    $m = $this->create->handle(['name' => 'Siti', 'phone' => '0812'], $this->user->id);

    app(UpdateMember::class)->handle($m, ['name' => 'Siti', 'phone' => '0812'], $this->user->id);

    expect(ActivityLog::where('action', 'member.updated')->count())->toBe(0);
});

// --- Keluar anggota --------------------------------------------------------

test('keluar menarik semua saldo, satu baris per jenis, dan menutup keanggotaan', function () {
    $m = $this->create->handle(['name' => 'Siti', 'joined_at' => now($this->tz)->startOfMonth()->toDateString()], $this->user->id);
    $this->post->deposit($m, SavingsType::Pokok, 100000, $this->user->id);
    $this->post->deposit($m, SavingsType::Wajib, 25000, $this->user->id, now($this->tz));
    $this->post->deposit($m, SavingsType::Sukarela, 40000, $this->user->id);

    $keluar = $this->exit->handle($m, $this->user->id);

    $tarik = SavingsEntry::where('member_id', $m->id)->where('entry_type', SavingsEntryType::Withdrawal)->get();

    expect($keluar->status)->toBe(MemberStatus::Exited)
        ->and($keluar->exited_at->toDateString())->toBe(now($this->tz)->toDateString())
        ->and($tarik)->toHaveCount(3)
        ->and($tarik->sum('amount'))->toBe(-165000)
        ->and($m->fresh()->balances())->toBe(['pokok' => 0, 'wajib' => 0, 'sukarela' => 0])
        ->and($tarik->every(fn ($r) => $r->balance_after === 0))->toBeTrue();

    $log = ActivityLog::where('action', 'member.exited')->firstOrFail();
    expect($log->properties)->toMatchArray(['total' => 165000]);
});

test('keluar hanya menarik jenis yang punya saldo; tanpa saldo tetap bisa keluar', function () {
    $m = $this->create->handle(['name' => 'Siti'], $this->user->id);
    $this->post->deposit($m, SavingsType::Sukarela, 7000, $this->user->id);
    $kosong = $this->create->handle(['name' => 'Budi'], $this->user->id);

    $this->exit->handle($m, $this->user->id);
    $this->exit->handle($kosong, $this->user->id);

    expect(SavingsEntry::where('entry_type', 'withdrawal')->count())->toBe(1)
        ->and($kosong->fresh()->status)->toBe(MemberStatus::Exited);
});

test('anggota tidak bisa keluar dua kali', function () {
    $m = $this->create->handle(['name' => 'Siti'], $this->user->id);
    $this->exit->handle($m, $this->user->id);

    expect(fn () => $this->exit->handle($m, $this->user->id))->toThrow(SavingsException::class, 'sudah keluar');
    expect(ActivityLog::where('action', 'member.exited')->count())->toBe(1);
});

test('setelah keluar tidak ada setoran atau penarikan baru, pembalikan tetap bisa', function () {
    $m = $this->create->handle(['name' => 'Siti'], $this->user->id);
    $this->post->deposit($m, SavingsType::Sukarela, 40000, $this->user->id);
    $this->exit->handle($m, $this->user->id);

    expect(fn () => $this->post->deposit($m, SavingsType::Sukarela, 5000, $this->user->id))->toThrow(SavingsException::class, 'sudah keluar');
    expect(fn () => $this->post->withdraw($m, SavingsType::Sukarela, 1000, $this->user->id))->toThrow(SavingsException::class, 'sudah keluar');

    $tarik = SavingsEntry::where('entry_type', 'withdrawal')->firstOrFail();
    $balik = $this->post->reverse($tarik, $this->user->id, 'salah keluar');

    expect($balik->balance_after)->toBe(40000)->and($m->fresh()->status)->toBe(MemberStatus::Exited);
});

test('keluar atomik: gagal di tengah tidak menyisakan penarikan sebagian', function () {
    $m = $this->create->handle(['name' => 'Siti'], $this->user->id);
    $this->post->deposit($m, SavingsType::Pokok, 100000, $this->user->id);
    $this->post->deposit($m, SavingsType::Sukarela, 5000, $this->user->id);
    $baris = SavingsEntry::count();

    // Paksa kegagalan pada langkah terakhir (mengubah status anggota), setelah semua penarikan ditulis.
    Member::updating(function (): never {
        throw new RuntimeException('gagal paksa');
    });

    try {
        expect(fn () => $this->exit->handle($m, $this->user->id))->toThrow(RuntimeException::class, 'gagal paksa');
    } finally {
        Member::flushEventListeners();
        Member::clearBootedModels();
    }

    expect(SavingsEntry::count())->toBe($baris)
        ->and($m->fresh()->status)->toBe(MemberStatus::Active)
        ->and($m->fresh()->balances())->toBe(['pokok' => 100000, 'wajib' => 0, 'sukarela' => 5000])
        ->and(ActivityLog::where('action', 'member.exited')->count())->toBe(0);
});
