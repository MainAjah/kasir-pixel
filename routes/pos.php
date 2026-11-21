<?php

use App\Http\Controllers\Pos\LookupController;
use App\Http\Controllers\Pos\PosController;
use App\Http\Controllers\Pos\SaleController;
use App\Http\Controllers\Pos\ShiftController;
use App\Http\Controllers\Pos\StoreEventController;
use Illuminate\Support\Facades\Route;

// Kasir (Tahap 3): peran kasir dan admin.
Route::middleware(['auth', 'role:kasir|admin'])->prefix('kasir')->group(function () {
    Route::get('/', [PosController::class, 'index'])->name('pos.index');

    Route::post('shift', [ShiftController::class, 'store'])->name('pos.shift.store');
    Route::get('shift/tutup', [ShiftController::class, 'closing'])->name('pos.shift.closing');
    Route::post('shift/tutup', [ShiftController::class, 'close'])->name('pos.shift.close');
    Route::get('shift/{shift}', [ShiftController::class, 'show'])->name('pos.shift.show');

    Route::get('barcode/{barcode}', [LookupController::class, 'barcode'])->name('pos.lookup.barcode');
    Route::get('cari', [LookupController::class, 'search'])->name('pos.lookup.search');

    Route::get('penjualan', [SaleController::class, 'index'])->name('pos.sales.index');
    Route::post('penjualan', [SaleController::class, 'store'])->name('pos.sales.store');
    Route::get('penjualan/{sale}/struk', [SaleController::class, 'receipt'])->name('pos.sales.receipt');

    Route::post('peristiwa', [StoreEventController::class, 'store'])
        ->middleware('throttle:240,1')
        ->name('pos.events.store');
});

// Pembatalan: hanya admin (docs/skema.md K5), dan hanya selama shift penjualan masih terbuka.
Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::post('kasir/penjualan/{sale}/batal', [SaleController::class, 'void'])->name('pos.sales.void');
});
