<?php

use App\Http\Controllers\Members\MemberController;
use App\Http\Controllers\Members\MemberExitController;
use App\Http\Controllers\Members\SavingsController;
use Illuminate\Support\Facades\Route;

// Anggota dan simpanan (Tahap 4): admin dan bendahara. Kasir hanya mencari anggota di layar kasir.
Route::middleware(['auth', 'role:admin|bendahara'])->prefix('anggota')->group(function () {
    Route::get('/', [MemberController::class, 'index'])->name('members.index');
    Route::get('baru', [MemberController::class, 'create'])->name('members.create');
    Route::post('/', [MemberController::class, 'store'])->name('members.store');

    Route::post('simpanan/{entry}/balik', [SavingsController::class, 'reverse'])->name('members.savings.reverse');

    Route::get('{member}', [MemberController::class, 'show'])->name('members.show');
    Route::get('{member}/ubah', [MemberController::class, 'edit'])->name('members.edit');
    Route::put('{member}', [MemberController::class, 'update'])->name('members.update');
    Route::post('{member}/simpanan', [SavingsController::class, 'store'])->name('members.savings.store');
    Route::post('{member}/keluar', [MemberExitController::class, 'store'])->name('members.exit');
});
