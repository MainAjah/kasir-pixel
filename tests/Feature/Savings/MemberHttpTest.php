<?php

use App\Actions\Savings\CreateMember;
use App\Actions\Savings\PostSaving;
use App\Enums\MemberStatus;
use App\Enums\SavingsType;
use App\Models\ActivityLog;
use App\Models\Member;
use App\Models\SavingsEntry;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    config([
        'koperasi.savings.pokok' => 100000,
        'koperasi.savings.wajib' => 25000,
        'koperasi.savings.sukarela_min' => 1000,
    ]);

    $this->admin = User::factory()->create()->assignRole('admin');
    $this->bendahara = User::factory()->create()->assignRole('bendahara');
    $this->kasir = User::factory()->create()->assignRole('kasir');
    $this->tz = config('app.display_timezone');
    $this->member = app(CreateMember::class)->handle([
        'name' => 'Siti Aminah',
        'joined_at' => now($this->tz)->subMonths(2)->startOfMonth()->toDateString(),
    ], $this->admin->id);
    $this->post = app(PostSaving::class);
});

// --- Hak akses -------------------------------------------------------------

test('tamu diarahkan ke login dari halaman anggota', function (string $url) {
    $this->get($url)->assertRedirect(route('login'));
})->with(['/anggota', '/anggota/baru', '/anggota/1', '/anggota/1/ubah']);

test('kasir tidak boleh membuka atau menulis apa pun di anggota', function () {
    $this->actingAs($this->kasir);
    $id = $this->member->id;

    foreach (['/anggota', '/anggota/baru', "/anggota/{$id}", "/anggota/{$id}/ubah"] as $url) {
        $this->get($url)->assertForbidden();
    }

    $this->post('/anggota', ['name' => 'X'])->assertForbidden();
    $this->put("/anggota/{$id}", ['name' => 'X'])->assertForbidden();
    $this->post("/anggota/{$id}/simpanan", ['savings_type' => 'sukarela', 'kind' => 'deposit', 'amount' => 5000])->assertForbidden();
    $this->post("/anggota/{$id}/keluar")->assertForbidden();

    expect(SavingsEntry::count())->toBe(0)->and($this->member->fresh()->status)->toBe(MemberStatus::Active);
});

test('admin dan bendahara boleh membuka halaman anggota', function (string $role) {
    $user = $role === 'admin' ? $this->admin : $this->bendahara;
    $id = $this->member->id;

    foreach (['/anggota', '/anggota/baru', "/anggota/{$id}", "/anggota/{$id}/ubah"] as $url) {
        $this->actingAs($user)->get($url)->assertOk();
    }
})->with(['admin', 'bendahara']);

// --- Pendaftaran dan ubah data --------------------------------------------

test('bendahara mendaftarkan anggota lewat formulir dan nomor berurutan', function () {
    $this->actingAs($this->bendahara)->post('/anggota', ['name' => 'Budi Santoso', 'phone' => '0812', 'address' => 'Jl. Melati'])
        ->assertSessionHasNoErrors();

    $budi = Member::where('name', 'Budi Santoso')->firstOrFail();

    expect($budi->member_number)->toBe('A-000002')
        ->and($budi->status)->toBe(MemberStatus::Active);
});

test('formulir anggota menolak nama kosong dan tidak menerima nomor atau status dari browser', function () {
    $this->actingAs($this->bendahara)->post('/anggota', ['name' => ''])->assertSessionHasErrors('name');

    $this->post('/anggota', ['name' => 'Cici', 'member_number' => 'A-777777', 'status' => 'exited'])->assertSessionHasNoErrors();

    $cici = Member::where('name', 'Cici')->firstOrFail();
    expect($cici->member_number)->toBe('A-000002')->and($cici->status)->toBe(MemberStatus::Active);
});

test('ubah anggota lewat formulir', function () {
    $this->actingAs($this->bendahara)->put("/anggota/{$this->member->id}", ['name' => 'Siti A.', 'phone' => '0899'])
        ->assertSessionHasNoErrors();

    expect($this->member->fresh()->name)->toBe('Siti A.')
        ->and($this->member->fresh()->member_number)->toBe('A-000001')
        ->and(ActivityLog::where('action', 'member.updated')->count())->toBe(1);
});

// --- Daftar dan buku -------------------------------------------------------

test('daftar anggota memuat saldo, penanda pokok belum dibayar, dan bisa dicari', function () {
    $lunas = app(CreateMember::class)->handle(['name' => 'Budi Lunas'], $this->admin->id);
    $this->post->deposit($lunas, SavingsType::Pokok, 100000, $this->admin->id);
    $this->post->deposit($lunas, SavingsType::Sukarela, 5000, $this->admin->id);

    $this->actingAs($this->bendahara)->get('/anggota')->assertInertia(fn (Assert $p) => $p
        ->component('anggota/index')
        ->has('members.data', 2)
        ->where('members.data.0.pokok_unpaid', true)
        ->where('members.data.1.name', 'Budi Lunas')
        ->where('members.data.1.pokok_unpaid', false)
        ->where('members.data.1.balances.pokok', 100000)
        ->where('members.data.1.balances.sukarela', 5000));

    $this->get('/anggota?q=Lunas')->assertInertia(fn (Assert $p) => $p->has('members.data', 1));
    $this->get('/anggota?q=A-000001')->assertInertia(fn (Assert $p) => $p->has('members.data', 1)->where('members.data.0.name', 'Siti Aminah'));
    $this->get('/anggota?q=%25')->assertInertia(fn (Assert $p) => $p->has('members.data', 0));
});

test('daftar anggota bisa disaring menurut status', function () {
    Member::factory()->exited()->create(['name' => 'Sudah Keluar']);

    $this->actingAs($this->bendahara)->get('/anggota?status=exited')
        ->assertInertia(fn (Assert $p) => $p->has('members.data', 1)->where('members.data.0.name', 'Sudah Keluar'));
    $this->get('/anggota?status=active')->assertInertia(fn (Assert $p) => $p->has('members.data', 1));
});

test('buku simpanan: saldo per jenis dan riwayat terbaru di atas', function () {
    $this->post->deposit($this->member, SavingsType::Pokok, 100000, $this->admin->id);
    $this->post->deposit($this->member, SavingsType::Sukarela, 40000, $this->admin->id);
    $this->post->withdraw($this->member, SavingsType::Sukarela, 10000, $this->admin->id, 'keperluan');

    $this->actingAs($this->bendahara)->get("/anggota/{$this->member->id}")->assertInertia(fn (Assert $p) => $p
        ->component('anggota/buku')
        ->where('balances.pokok', 100000)
        ->where('balances.wajib', 0)
        ->where('balances.sukarela', 30000)
        ->where('rates.wajib', 25000)
        ->has('entries.data', 3)
        ->where('entries.data.0.entry_type', 'withdrawal')
        ->where('entries.data.0.balance_after', 30000)
        ->where('entries.data.0.note', 'keperluan')
        ->where('entries.data.2.savings_type', 'pokok'));
});

test('buku simpanan bisa disaring per jenis', function () {
    $this->post->deposit($this->member, SavingsType::Pokok, 100000, $this->admin->id);
    $this->post->deposit($this->member, SavingsType::Sukarela, 40000, $this->admin->id);

    $this->actingAs($this->bendahara)->get("/anggota/{$this->member->id}?jenis=sukarela")
        ->assertInertia(fn (Assert $p) => $p->has('entries.data', 1)->where('entries.data.0.savings_type', 'sukarela'));
});

test('buku menandai baris yang bisa dibalik dan yang sudah dibalik', function () {
    $a = $this->post->deposit($this->member, SavingsType::Sukarela, 40000, $this->admin->id);
    $this->post->reverse($a, $this->admin->id, 'salah');

    $this->actingAs($this->bendahara)->get("/anggota/{$this->member->id}")->assertInertia(fn (Assert $p) => $p
        ->where('entries.data.0.is_reversal', true)
        ->where('entries.data.0.can_reverse', false)
        ->where('entries.data.1.is_reversed', true)
        ->where('entries.data.1.can_reverse', false));
});

test('buku menyediakan pilihan bulan wajib dari bulan bergabung dengan penanda sudah dibayar', function () {
    $bulanIni = now($this->tz)->startOfMonth();
    $this->post->deposit($this->member, SavingsType::Wajib, 25000, $this->admin->id, $bulanIni->copy()->subMonth());

    $this->actingAs($this->bendahara)->get("/anggota/{$this->member->id}")->assertInertia(fn (Assert $p) => $p
        ->has('months', 3)
        ->where('months.0.value', $bulanIni->toDateString())
        ->where('months.0.paid', false)
        ->where('months.1.paid', true)
        ->where('months.2.paid', false));
});

// --- Simpanan lewat HTTP ---------------------------------------------------

test('setor dan tarik lewat formulir', function () {
    $this->actingAs($this->bendahara);
    $url = "/anggota/{$this->member->id}/simpanan";

    $this->post($url, ['savings_type' => 'pokok', 'kind' => 'deposit', 'amount' => 100000])->assertSessionHasNoErrors();
    $this->post($url, ['savings_type' => 'sukarela', 'kind' => 'deposit', 'amount' => 50000, 'note' => 'tabungan'])->assertSessionHasNoErrors();
    $this->post($url, ['savings_type' => 'sukarela', 'kind' => 'withdrawal', 'amount' => 20000])->assertSessionHasNoErrors();
    $this->post($url, [
        'savings_type' => 'wajib', 'kind' => 'deposit', 'amount' => 25000, 'period' => now($this->tz)->startOfMonth()->toDateString(),
    ])->assertSessionHasNoErrors();

    expect($this->member->fresh()->balances())->toBe(['pokok' => 100000, 'wajib' => 25000, 'sukarela' => 30000])
        ->and(SavingsEntry::where('created_by', $this->bendahara->id)->count())->toBe(4);
});

test('pelanggaran aturan simpanan tampil sebagai pesan dan tidak menyimpan apa pun', function () {
    $this->actingAs($this->bendahara);
    $url = "/anggota/{$this->member->id}/simpanan";

    $this->post($url, ['savings_type' => 'pokok', 'kind' => 'deposit', 'amount' => 50000])->assertSessionHasErrors('amount');
    $this->post($url, ['savings_type' => 'sukarela', 'kind' => 'withdrawal', 'amount' => 1000])->assertSessionHasErrors('amount');
    $this->post($url, ['savings_type' => 'wajib', 'kind' => 'withdrawal', 'amount' => 25000])->assertSessionHasErrors('amount');
    $this->post($url, ['savings_type' => 'wajib', 'kind' => 'deposit', 'amount' => 25000])->assertSessionHasErrors('amount');

    expect(SavingsEntry::count())->toBe(0);
});

test('permintaan simpanan tidak valid ditolak validasi', function () {
    $this->actingAs($this->bendahara);
    $url = "/anggota/{$this->member->id}/simpanan";

    $this->post($url, ['savings_type' => 'emas', 'kind' => 'deposit', 'amount' => 5000])->assertSessionHasErrors('savings_type');
    $this->post($url, ['savings_type' => 'sukarela', 'kind' => 'pindah', 'amount' => 5000])->assertSessionHasErrors('kind');
    $this->post($url, ['savings_type' => 'sukarela', 'kind' => 'deposit', 'amount' => -5])->assertSessionHasErrors('amount');
    $this->post($url, ['savings_type' => 'sukarela', 'kind' => 'deposit', 'amount' => 'abc'])->assertSessionHasErrors('amount');
});

test('pembalikan lewat formulir, alasan wajib, dan sekali saja', function () {
    $entry = $this->post->deposit($this->member, SavingsType::Sukarela, 40000, $this->admin->id);

    $this->actingAs($this->bendahara)->post("/anggota/simpanan/{$entry->id}/balik", ['reason' => ''])->assertSessionHasErrors('reason');
    $this->post("/anggota/simpanan/{$entry->id}/balik", ['reason' => 'salah input'])->assertSessionHasNoErrors();
    $this->post("/anggota/simpanan/{$entry->id}/balik", ['reason' => 'lagi'])->assertSessionHasErrors('reason');

    expect($this->member->fresh()->balance(SavingsType::Sukarela))->toBe(0)
        ->and(SavingsEntry::count())->toBe(2);
});

test('kasir tidak bisa membalik simpanan', function () {
    $entry = $this->post->deposit($this->member, SavingsType::Sukarela, 40000, $this->admin->id);

    $this->actingAs($this->kasir)->post("/anggota/simpanan/{$entry->id}/balik", ['reason' => 'coba'])->assertForbidden();

    expect(SavingsEntry::count())->toBe(1);
});

// --- Keluar anggota lewat HTTP ----------------------------------------------

test('keluar anggota lewat HTTP menarik semua saldo, dan tidak bisa dua kali', function () {
    $this->post->deposit($this->member, SavingsType::Sukarela, 40000, $this->admin->id);

    $this->actingAs($this->bendahara)->post("/anggota/{$this->member->id}/keluar")->assertSessionHasNoErrors();

    expect($this->member->fresh()->status)->toBe(MemberStatus::Exited)
        ->and($this->member->fresh()->balance(SavingsType::Sukarela))->toBe(0);

    $this->post("/anggota/{$this->member->id}/keluar")->assertSessionHasErrors('exit');

    $this->post("/anggota/{$this->member->id}/simpanan", ['savings_type' => 'sukarela', 'kind' => 'deposit', 'amount' => 5000])
        ->assertSessionHasErrors('amount');
});
