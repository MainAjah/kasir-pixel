<?php

namespace App\Http\Controllers\Pos;

use App\Events\ItemScanned;
use App\Events\SaleOpened;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\StoreEventRequest;
use Illuminate\Http\Response;

/**
 * Relai peristiwa dari layar kasir ke event Laravel (fire-and-forget).
 *
 * "Transaksi dibuka" dan "barang dipindai" terjadi di browser sebelum ada data di database,
 * jadi satu-satunya jalan ke sisi server adalah lewat sini. Tidak menyentuh database.
 * Tahap 8 (Reverb) cukup menjadikan event ini ShouldBroadcast.
 */
class StoreEventController extends Controller
{
    public function store(StoreEventRequest $request): Response
    {
        $user = $request->user();
        $data = $request->validated();

        if ($data['type'] === SaleOpened::name()) {
            SaleOpened::dispatch($user->id, $user->name);
        } else {
            ItemScanned::dispatch($user->id, $user->name, $data['product'], $data['unit'], (int) $data['qty']);
        }

        return response()->noContent();
    }
}
