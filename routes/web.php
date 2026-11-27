<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DashboardFeedController;
use App\Http\Controllers\DashboardPostController;
use App\Http\Controllers\Diorama\SimulateSaleController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Beranda (Tahap 5D-1): semua peran.
Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Polling Beranda tiap 5 detik: penjualan baru, angka Hari Ini, isi rak. Hanya membaca.
    Route::get('beranda/peristiwa', DashboardFeedController::class)
        ->middleware('throttle:120,1')
        ->name('dashboard.feed');

    // Tahap 5D-2: membuka pos di Beranda; akses dijaga Gate `open-post` (App\Enums\Post).
    Route::get('beranda/pos/{post}', DashboardPostController::class)
        ->name('dashboard.post');
});

// Pratinjau mesin diorama (Tahap 5B): hanya admin, tidak membaca atau menulis data.
Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::inertia('diorama-lab', 'diorama-lab')->name('diorama.lab');

    // Tahap 5H: prototipe diorama 3D (three.js), terpisah dari Beranda dan diorama lab.
    Route::inertia('diorama-3d-lab', 'diorama-3d-lab')->name('diorama.lab3d');

    // Tahap HD-2D B1: pratinjau token dan komponen dasar, data contoh saja.
    Route::inertia('hd2d-lab', 'hd2d-lab')->name('hd2d.lab');

    // Tahap 6: satu penjualan acak sungguhan (lewat CompleteSale) untuk demo.
    Route::post('diorama-lab/simulasi', [SimulateSaleController::class, 'store'])
        ->middleware('throttle:60,1')
        ->name('diorama.simulate');
});

require __DIR__.'/settings.php';
require __DIR__.'/inventory.php';
require __DIR__.'/pos.php';
require __DIR__.'/members.php';
require __DIR__.'/admin.php';
