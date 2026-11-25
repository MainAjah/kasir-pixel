<?php

namespace App\Http\Controllers\Api\Reports;

use App\Actions\Reports\SalesReport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ReportRequest;
use App\Support\CsvWriter;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Laporan penjualan lewat REST API (Tahap 11A, admin). Isi sama dengan halaman
 * laporan: filter periode dan kasir, ringkasan, per hari, produk terlaris, per
 * kasir, dan penjualan dibatalkan. Validasi filter (ReportRequest) menjawab 422.
 */
class SalesReportController extends Controller
{
    public function index(ReportRequest $request, SalesReport $report): JsonResponse
    {
        $period = $request->period();
        $cashierId = $request->cashierId();

        return response()->json([
            'data' => [
                'filters' => $period->toArray() + ['kasir' => $cashierId],
                'cashiers' => $report->cashierOptions(),
                'report' => $report->handle($period, $cashierId),
            ],
        ]);
    }

    public function csv(ReportRequest $request, SalesReport $report): StreamedResponse
    {
        $period = $request->period();
        $name = 'laporan-penjualan-'.$period->start->format('Ymd').'-'.$period->end->format('Ymd').'.csv';

        return CsvWriter::download($name, SalesReport::csvHeader(), $report->csvRows($period, $request->cashierId()));
    }
}
