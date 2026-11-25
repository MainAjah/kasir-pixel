<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Halaman laporan penjualan (admin, dijaga rute `role:admin`).
 *
 * Tahap 11A: hanya kerangka halaman. Datanya diambil halaman dari REST API
 * (`GET /api/v1/laporan/penjualan`, lihat Api\Reports\SalesReportController),
 * dengan filter dari query string alamat halaman ini.
 */
class SalesReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('laporan/penjualan');
    }
}
