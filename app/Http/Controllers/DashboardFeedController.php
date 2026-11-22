<?php

namespace App\Http\Controllers;

use App\Actions\Dashboard\DashboardFeed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Polling Beranda (Tahap 5D-1): semua peran, hanya membaca. */
class DashboardFeedController extends Controller
{
    public function __invoke(Request $request, DashboardFeed $feed): JsonResponse
    {
        $data = $request->validate([
            'sale' => ['required', 'integer', 'min:0'],
            'void' => ['required', 'integer', 'min:0'],
        ]);

        return response()->json($feed->handle((int) $data['sale'], (int) $data['void']));
    }
}
