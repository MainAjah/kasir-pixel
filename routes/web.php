<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

// Pratinjau mesin diorama (Tahap 5B): hanya admin, tidak membaca atau menulis data.
Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::inertia('diorama-lab', 'diorama-lab')->name('diorama.lab');
});

require __DIR__.'/settings.php';
require __DIR__.'/inventory.php';
require __DIR__.'/pos.php';
require __DIR__.'/members.php';
