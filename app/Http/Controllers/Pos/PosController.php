<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Models\CashShift;
use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    /** Layar kasir: bila belum ada shift aktif, halaman meminta kas awal. */
    public function index(Request $request): Response
    {
        $shift = CashShift::activeFor($request->user());

        return Inertia::render('kasir/index', [
            'shift' => $shift ? [
                'id' => $shift->id,
                'opened_at' => $shift->opened_at->timezone(config('app.display_timezone'))->format('d/m/Y H:i'),
                'opening_cash' => $shift->opening_cash,
                'sales_count' => Sale::where('cash_shift_id', $shift->id)->whereDoesntHave('void')->count(),
            ] : null,
            'cashier' => ['id' => $request->user()->id, 'name' => $request->user()->name],
        ]);
    }
}
