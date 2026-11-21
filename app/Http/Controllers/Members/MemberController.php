<?php

namespace App\Http\Controllers\Members;

use App\Actions\Savings\CreateMember;
use App\Actions\Savings\UpdateMember;
use App\Enums\MemberStatus;
use App\Enums\SavingsEntryType;
use App\Enums\SavingsType;
use App\Exceptions\SavingsException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Members\MemberRequest;
use App\Models\Member;
use App\Models\SavingsEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $status = $request->query('status', 'all');
        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q).'%';

        $members = Member::query()
            ->when($q !== '', fn ($query) => $query->where(
                fn ($w) => $w->where('member_number', 'like', $like)->orWhere('name', 'like', $like)
            ))
            ->when(in_array($status, ['active', 'exited'], true), fn ($query) => $query->where('status', $status))
            ->orderBy('member_number')
            ->paginate(20)
            ->withQueryString();

        $balances = Member::balancesFor(collect($members->items())->pluck('id'));

        $members->through(fn (Member $m) => [
            'id' => $m->id,
            'number' => $m->member_number,
            'name' => $m->name,
            'phone' => $m->phone,
            'status' => $m->status->value,
            'status_label' => $m->status->label(),
            'joined_at' => $m->joined_at->format('d/m/Y'),
            'balances' => $balances[$m->id],
            // Pendaftaran tidak otomatis menyetor pokok; tandai yang belum membayar.
            'pokok_unpaid' => $m->isActive() && $balances[$m->id]['pokok'] === 0,
        ]);

        return Inertia::render('anggota/index', [
            'members' => $members,
            'filters' => ['q' => $q, 'status' => in_array($status, ['active', 'exited'], true) ? $status : 'all'],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('anggota/form', ['member' => null]);
    }

    public function store(MemberRequest $request, CreateMember $action): RedirectResponse
    {
        try {
            $member = $action->handle($request->validated(), $request->user()->id);
        } catch (SavingsException $e) {
            return back()->withErrors(['name' => $e->getMessage()])->withInput();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "Anggota {$member->member_number} terdaftar."]);

        return to_route('members.show', $member);
    }

    public function edit(Member $member): Response
    {
        return Inertia::render('anggota/form', [
            'member' => [
                'id' => $member->id,
                'number' => $member->member_number,
                'name' => $member->name,
                'phone' => $member->phone,
                'address' => $member->address,
                'joined_at' => $member->joined_at->toDateString(),
                'status' => $member->status->value,
            ],
        ]);
    }

    public function update(MemberRequest $request, Member $member, UpdateMember $action): RedirectResponse
    {
        try {
            $action->handle($member, $request->validated(), $request->user()->id);
        } catch (SavingsException $e) {
            return back()->withErrors(['name' => $e->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Data anggota disimpan.']);

        return to_route('members.show', $member);
    }

    /** Buku simpanan: saldo per jenis dan riwayat (terbaru di atas). */
    public function show(Request $request, Member $member): Response
    {
        $tz = config('app.display_timezone');
        $type = SavingsType::tryFrom((string) $request->query('jenis', ''));

        $entries = SavingsEntry::query()
            ->where('member_id', $member->id)
            ->when($type, fn ($q) => $q->where('savings_type', $type))
            ->with(['creator:id,name', 'reversedBy:id,reverses_entry_id'])
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (SavingsEntry $e) => [
                'id' => $e->id,
                'number' => $e->number,
                'time' => $e->occurred_at->timezone($tz)->format('d/m/Y H:i'),
                'savings_type' => $e->savings_type->value,
                'type_label' => $e->savings_type->label(),
                'entry_type' => $e->entry_type->value,
                'entry_label' => $e->entry_type->label(),
                'amount' => $e->amount,
                'balance_after' => $e->balance_after,
                'period' => $e->period?->format('m/Y'),
                'note' => $e->note,
                'by' => $e->creator?->name,
                'is_reversal' => $e->entry_type === SavingsEntryType::Reversal,
                'is_reversed' => $e->reversedBy !== null,
                'can_reverse' => $e->entry_type !== SavingsEntryType::Reversal && $e->reversedBy === null,
            ]);

        return Inertia::render('anggota/buku', [
            'member' => [
                'id' => $member->id,
                'number' => $member->member_number,
                'name' => $member->name,
                'phone' => $member->phone,
                'address' => $member->address,
                'status' => $member->status->value,
                'status_label' => $member->status->label(),
                'is_active' => $member->status === MemberStatus::Active,
                'joined_at' => $member->joined_at->format('d/m/Y'),
                'exited_at' => $member->exited_at?->format('d/m/Y'),
            ],
            'balances' => $member->balances(),
            'rates' => [
                'pokok' => (int) config('koperasi.savings.pokok'),
                'wajib' => (int) config('koperasi.savings.wajib'),
                'sukarela_min' => (int) config('koperasi.savings.sukarela_min'),
            ],
            'months' => $this->wajibMonths($member),
            'entries' => $entries,
            'filter' => $type?->value,
        ]);
    }

    /**
     * Bulan yang bisa dipilih untuk simpanan wajib (dari bulan bergabung sampai bulan ini),
     * dengan penanda yang sudah dibayar (tidak termasuk yang sudah dibalik).
     *
     * @return array<int, array{value: string, label: string, paid: bool}>
     */
    private function wajibMonths(Member $member): array
    {
        $tz = config('app.display_timezone');
        $paid = SavingsEntry::query()
            ->where('member_id', $member->id)
            ->where('savings_type', SavingsType::Wajib)
            ->where('entry_type', SavingsEntryType::Deposit)
            ->whereDoesntHave('reversedBy')
            ->pluck('period')
            ->map(fn ($d) => $d->format('Y-m'))
            ->all();

        $months = [];
        $cursor = now($tz)->startOfMonth();
        $start = $member->joined_at->copy()->startOfMonth()->shiftTimezone($tz);

        // Paling baru di atas, paling banyak 36 bulan agar daftar tidak membengkak.
        while ($cursor->gte($start) && count($months) < 36) {
            $months[] = [
                'value' => $cursor->toDateString(),
                'label' => $cursor->format('m/Y'),
                'paid' => in_array($cursor->format('Y-m'), $paid, true),
            ];
            $cursor = $cursor->copy()->subMonth();
        }

        return $months;
    }
}
