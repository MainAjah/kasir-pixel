<?php

use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\Reports\InventoryReportController;
use App\Http\Controllers\Api\Reports\SalesReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\TokenController;
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Support\Facades\Route;

/*
| REST API (Tahap 10), awalan /api/v1, semua JSON.
| Klien di luar browser memakai token Bearer (POST /api/v1/token); layar kasir yang
| sudah login memakai cookie sesinya (Sanctum stateful). Hak akses sama dengan rute web.
| Dokumentasi: docs/api.md.
*/

Route::prefix('v1')->name('api.')->group(function () {
    Route::post('token', [TokenController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('token.store');

    Route::middleware(['auth:sanctum', EnsureUserIsActive::class])->group(function () {
        Route::delete('token', [TokenController::class, 'destroy'])->name('token.destroy');

        Route::middleware('role:kasir|admin')->group(function () {
            Route::get('produk', [ProductController::class, 'index'])->name('products.index');
            Route::get('produk/{product}', [ProductController::class, 'show'])
                ->whereNumber('product')
                ->name('products.show');
            Route::post('keranjang/hitung', [CartController::class, 'price'])->name('cart.price');
            Route::post('penjualan', [SaleController::class, 'store'])
                ->middleware('throttle:60,1')
                ->name('sales.store');
            Route::get('penjualan/{sale}', [SaleController::class, 'show'])
                ->whereNumber('sale')
                ->name('sales.show');
        });

        Route::middleware('role:admin')->group(function () {
            Route::get('produk/{product}/mutasi', [StockMovementController::class, 'index'])
                ->whereNumber('product')
                ->name('products.movements');

            // Tahap 11A: laporan penjualan dan inventaris (hanya membaca) beserta CSV.
            Route::get('laporan/penjualan', [SalesReportController::class, 'index'])->name('reports.sales');
            Route::get('laporan/penjualan.csv', [SalesReportController::class, 'csv'])->name('reports.sales.csv');
            Route::get('laporan/inventaris', [InventoryReportController::class, 'index'])->name('reports.inventory');
            Route::get('laporan/inventaris.csv', [InventoryReportController::class, 'csv'])->name('reports.inventory.csv');
        });
    });
});
