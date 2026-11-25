<?php

namespace App\Http\Controllers\Api\Reports;

use App\Actions\Reports\InventoryReport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ReportRequest;
use App\Support\CsvWriter;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Laporan inventaris lewat REST API (Tahap 11A, admin): stok saat ini dari ledger,
 * status, nilai stok, dan mutasi per produk untuk periode terpilih.
 */
class InventoryReportController extends Controller
{
    public function index(ReportRequest $request, InventoryReport $report): JsonResponse
    {
        $period = $request->period();

        return response()->json([
            'data' => [
                'filters' => $period->toArray(),
                'report' => $report->handle($period),
            ],
        ]);
    }

    public function csv(ReportRequest $request, InventoryReport $report): StreamedResponse
    {
        $period = $request->period();
        $name = 'laporan-inventaris-'.$period->start->format('Ymd').'-'.$period->end->format('Ymd').'.csv';

        return CsvWriter::download($name, InventoryReport::csvHeader(), $report->csvRows($period));
    }
}
