<?php

namespace App\Http\Controllers\Members;

use App\Actions\Savings\ExitMember;
use App\Exceptions\SavingsException;
use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MemberExitController extends Controller
{
    public function store(Request $request, Member $member, ExitMember $action): RedirectResponse
    {
        try {
            $action->handle($member, $request->user()->id);
        } catch (SavingsException $e) {
            return back()->withErrors(['exit' => $e->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "Anggota {$member->member_number} keluar. Semua simpanan ditarik."]);

        return to_route('members.show', $member);
    }
}
