<?php

namespace App\Http\Controllers\Reports;

use App\Actions\Reports\SalesReport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ReportRequest;
use App\Support\CsvWriter;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Laporan penjualan (Tahap 6C): hanya admin, dijaga rute `role:admin`. */
class SalesReportController extends Controller
{
    public function index(ReportRequest $request, SalesReport $report): Response
    {
        $period = $request->period();
        $cashierId = $request->cashierId();

        return Inertia::render('laporan/penjualan', [
            'filters' => $period->toArray() + ['kasir' => $cashierId],
            'cashiers' => $report->cashierOptions(),
            'report' => $report->handle($period, $cashierId),
        ]);
    }

    public function csv(ReportRequest $request, SalesReport $report): StreamedResponse
    {
        $period = $request->period();
        $name = 'laporan-penjualan-'.$period->start->format('Ymd').'-'.$period->end->format('Ymd').'.csv';

        return CsvWriter::download($name, SalesReport::csvHeader(), $report->csvRows($period, $request->cashierId()));
    }
}
