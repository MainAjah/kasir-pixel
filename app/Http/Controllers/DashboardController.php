<?php

namespace App\Http\Controllers;

use App\Actions\Dashboard\DashboardFeed;
use App\Actions\Dashboard\ShelfStock;
use App\Actions\Dashboard\TodaySummary;
use Inertia\Inertia;
use Inertia\Response;

/** Beranda (Tahap 5D-1): diorama layar penuh dan kartu "Hari Ini". Semua peran, hanya membaca. */
class DashboardController extends Controller
{
    public function __invoke(TodaySummary $summary, ShelfStock $shelves): Response
    {
        return Inertia::render('dashboard', [
            'today' => $summary->handle(),
            'shelves' => $shelves->handle(),
            // Kursor polling: penjualan yang sudah ada saat halaman dibuka tidak diputar ulang.
            'cursor' => DashboardFeed::cursor(),
        ]);
    }
}
