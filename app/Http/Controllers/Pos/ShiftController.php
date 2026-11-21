<?php

namespace App\Http\Controllers\Pos;

use App\Actions\Pos\CloseShift;
use App\Actions\Pos\OpenShift;
use App\Enums\Role;
use App\Exceptions\PosException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\CloseShiftRequest;
use App\Http\Requests\Pos\OpenShiftRequest;
use App\Models\CashShift;
use App\Models\Payment;
use App\Models\Sale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShiftController extends Controller
{
    public function store(OpenShiftRequest $request, OpenShift $action): RedirectResponse
    {
        try {
            $action->handle($request->user(), $request->validated('opening_cash'));
        } catch (PosException $e) {
            return back()->withErrors(['opening_cash' => $e->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Shift dibuka.']);

        return to_route('pos.index');
    }

    /** Halaman tutup shift: ringkasan lalu isian uang hitung. Angka "seharusnya" baru muncul setelah ditutup. */
    public function closing(Request $request): Response|RedirectResponse
    {
        $shift = CashShift::activeFor($request->user());

        if ($shift === null) {
            return to_route('pos.index');
        }

        $valid = Sale::where('cash_shift_id', $shift->id)->whereDoesntHave('void');

        return Inertia::render('kasir/tutup-shift', [
            'shift' => [
                'id' => $shift->id,
                'opened_at' => $shift->opened_at->timezone(config('app.display_timezone'))->format('d/m/Y H:i'),
                'opening_cash' => $shift->opening_cash,
                'sales_count' => (clone $valid)->count(),
                'cash_sales' => (int) Payment::whereIn('sale_id', (clone $valid)->select('id'))->sum('amount'),
                'voided_count' => Sale::where('cash_shift_id', $shift->id)->whereHas('void')->count(),
            ],
        ]);
    }

    public function close(CloseShiftRequest $request, CloseShift $action): RedirectResponse
    {
        $shift = CashShift::activeFor($request->user());

        if ($shift === null) {
            return to_route('pos.index');
        }

        try {
            $closed = $action->handle(
                $shift,
                $request->user(),
                $request->validated('counted_cash'),
                $request->validated('closing_note'),
            );
        } catch (PosException $e) {
            return back()->withErrors(['counted_cash' => $e->getMessage()])->withInput();
        }

        return to_route('pos.shift.show', $closed);
    }

    /** Hasil shift (setelah ditutup, atau shift yang masih berjalan). Pemilik dan admin saja. */
    public function show(Request $request, CashShift $shift): Response
    {
        abort_unless(
            $shift->user_id === $request->user()->id || $request->user()->hasRole(Role::Admin->value),
            403,
        );

        $tz = config('app.display_timezone');

        return Inertia::render('kasir/shift', [
            'shift' => [
                'id' => $shift->id,
                'cashier' => $shift->user->name,
                'opened_at' => $shift->opened_at->timezone($tz)->format('d/m/Y H:i'),
                'closed_at' => $shift->closed_at?->timezone($tz)->format('d/m/Y H:i'),
                'opening_cash' => $shift->opening_cash,
                'expected_cash' => $shift->expected_cash,
                'counted_cash' => $shift->counted_cash,
                'difference' => $shift->difference,
                'closing_note' => $shift->closing_note,
            ],
        ]);
    }
}
