<?php

use App\Http\Controllers\Admin\AccessController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Reports\InventoryReportController;
use App\Http\Controllers\Reports\SalesReportController;
use Illuminate\Support\Facades\Route;

// Tahap 6B dan 6C: kelola pengguna, hak akses, dan laporan; hanya admin (pengelola koperasi).
Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('pengguna', [UserController::class, 'index'])->name('users.index');
    Route::get('pengguna/baru', [UserController::class, 'create'])->name('users.create');
    Route::post('pengguna', [UserController::class, 'store'])->name('users.store');
    Route::get('pengguna/{user}/ubah', [UserController::class, 'edit'])->name('users.edit');
    Route::put('pengguna/{user}', [UserController::class, 'update'])->name('users.update');
    Route::post('pengguna/{user}/nonaktifkan', [UserController::class, 'deactivate'])->name('users.deactivate');
    Route::post('pengguna/{user}/aktifkan', [UserController::class, 'activate'])->name('users.activate');

    Route::get('hak-akses', [AccessController::class, 'index'])->name('access.index');
    Route::put('hak-akses/pengguna/{user}', [AccessController::class, 'update'])->name('access.update');

    // Tahap 6C: laporan penjualan dan inventaris, hanya membaca.
    Route::get('laporan/penjualan', [SalesReportController::class, 'index'])->name('reports.sales');
    Route::get('laporan/penjualan/csv', [SalesReportController::class, 'csv'])->name('reports.sales.csv');
    Route::get('laporan/inventaris', [InventoryReportController::class, 'index'])->name('reports.inventory');
    Route::get('laporan/inventaris/csv', [InventoryReportController::class, 'csv'])->name('reports.inventory.csv');
});
