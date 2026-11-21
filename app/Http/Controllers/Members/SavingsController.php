<?php

namespace App\Http\Controllers\Members;

use App\Actions\Savings\PostSaving;
use App\Enums\SavingsType;
use App\Exceptions\SavingsException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Members\ReverseSavingsRequest;
use App\Http\Requests\Members\SavingsRequest;
use App\Models\Member;
use App\Models\SavingsEntry;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class SavingsController extends Controller
{
    /** Setor atau tarik. Aturan ada di PostSaving; controller hanya meneruskan. */
    public function store(SavingsRequest $request, Member $member, PostSaving $action): RedirectResponse
    {
        $data = $request->validated();
        $type = SavingsType::from($data['savings_type']);

        try {
            $entry = $data['kind'] === 'deposit'
                ? $action->deposit($member, $type, $data['amount'], $request->user()->id, $data['period'] ?? null, $data['note'] ?? null)
                : $action->withdraw($member, $type, $data['amount'], $request->user()->id, $data['note'] ?? null);
        } catch (SavingsException $e) {
            return back()->withErrors(['amount' => $e->getMessage()])->withInput();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "Tercatat {$entry->number}."]);

        return to_route('members.show', $member);
    }

    public function reverse(ReverseSavingsRequest $request, SavingsEntry $entry, PostSaving $action): RedirectResponse
    {
        try {
            $reversal = $action->reverse($entry, $request->user()->id, $request->validated('reason'));
        } catch (SavingsException $e) {
            return back()->withErrors(['reason' => $e->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$entry->number} dibalik ({$reversal->number})."]);

        return to_route('members.show', $entry->member_id);
    }
}
