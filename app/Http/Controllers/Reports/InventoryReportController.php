<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Halaman laporan inventaris (admin, dijaga rute `role:admin`).
 *
 * Tahap 11A: hanya kerangka halaman. Datanya diambil halaman dari REST API
 * (`GET /api/v1/laporan/inventaris`, lihat Api\Reports\InventoryReportController).
 */
class InventoryReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('laporan/inventaris');
    }
}
