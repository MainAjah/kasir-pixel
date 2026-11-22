<?php

namespace App\Http\Controllers\Reports;

use App\Actions\Reports\InventoryReport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ReportRequest;
use App\Support\CsvWriter;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Laporan inventaris (Tahap 6C): hanya admin, dijaga rute `role:admin`. */
class InventoryReportController extends Controller
{
    public function index(ReportRequest $request, InventoryReport $report): Response
    {
        $period = $request->period();

        return Inertia::render('laporan/inventaris', [
            'filters' => $period->toArray(),
            'report' => $report->handle($period),
        ]);
    }

    public function csv(ReportRequest $request, InventoryReport $report): StreamedResponse
    {
        $period = $request->period();
        $name = 'laporan-inventaris-'.$period->start->format('Ymd').'-'.$period->end->format('Ymd').'.csv';

        return CsvWriter::download($name, InventoryReport::csvHeader(), $report->csvRows($period));
    }
}
