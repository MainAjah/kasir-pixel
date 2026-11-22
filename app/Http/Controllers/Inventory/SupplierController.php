<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Suppliers\SaveSupplier;
use App\Actions\Suppliers\SetSupplierActive;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\SupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Supplier (Tahap 6B): data master, hanya admin, dijaga rute `role:admin`. */
class SupplierController extends Controller
{
    public function index(): Response
    {
        $suppliers = Supplier::query()
            ->withCount('stockEntries')
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->paginate(20)
            ->through(fn (Supplier $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'contact' => $s->contact,
                'address' => $s->address,
                'note' => $s->note,
                'is_active' => $s->is_active,
                'entries' => $s->stock_entries_count,
            ]);

        return Inertia::render('inventaris/supplier/index', ['suppliers' => $suppliers]);
    }

    public function create(): Response
    {
        return Inertia::render('inventaris/supplier/form', ['supplier' => null]);
    }

    public function store(SupplierRequest $request, SaveSupplier $action): RedirectResponse
    {
        $supplier = $action->handle(null, $request->validated(), $request->user()->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Supplier {$supplier->name} ditambahkan."]);

        return to_route('suppliers.index');
    }

    public function edit(Supplier $supplier): Response
    {
        return Inertia::render('inventaris/supplier/form', [
            'supplier' => $supplier->only(['id', 'name', 'contact', 'address', 'note', 'is_active']),
        ]);
    }

    public function update(SupplierRequest $request, Supplier $supplier, SaveSupplier $action): RedirectResponse
    {
        $action->handle($supplier, $request->validated(), $request->user()->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Supplier {$supplier->name} diperbarui."]);

        return to_route('suppliers.index');
    }

    public function deactivate(Request $request, Supplier $supplier, SetSupplierActive $action): RedirectResponse
    {
        $action->handle($supplier, false, $request->user()->id);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Supplier {$supplier->name} dinonaktifkan."]);

        return back();
    }

    public function activate(Request $request, Supplier $supplier, SetSupplierActive $action): RedirectResponse
    {
        $action->handle($supplier, true, $request->user()->id);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Supplier {$supplier->name} diaktifkan."]);

        return back();
    }
}
