<?php

use App\Http\Controllers\Inventory\CategoryController;
use App\Http\Controllers\Inventory\ProductController;
use App\Http\Controllers\Inventory\StockAdjustmentController;
use App\Http\Controllers\Inventory\StockCardController;
use App\Http\Controllers\Inventory\StockReceiptController;
use Illuminate\Support\Facades\Route;

// Kasir boleh membaca daftar produk (Tahap 3); menulis dan halaman lain tetap admin.
Route::middleware(['auth', 'role:kasir|admin'])->group(function () {
    Route::get('produk', [ProductController::class, 'index'])->name('products.index');
});

// Inventaris (Tahap 2): hanya admin.
Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('produk/baru', [ProductController::class, 'create'])->name('products.create');
    Route::post('produk', [ProductController::class, 'store'])->name('products.store');
    Route::get('produk/{product}/ubah', [ProductController::class, 'edit'])->name('products.edit');
    Route::put('produk/{product}', [ProductController::class, 'update'])->name('products.update');
    Route::get('produk/{product}/kartu-stok', [StockCardController::class, 'show'])->name('products.stock-card');

    Route::get('penerimaan-barang', [StockReceiptController::class, 'index'])->name('stock-receipts.index');
    Route::get('penerimaan-barang/baru', [StockReceiptController::class, 'create'])->name('stock-receipts.create');
    Route::post('penerimaan-barang', [StockReceiptController::class, 'store'])->name('stock-receipts.store');

    Route::get('koreksi-stok', [StockAdjustmentController::class, 'create'])->name('stock-adjustments.create');
    Route::post('koreksi-stok', [StockAdjustmentController::class, 'store'])->name('stock-adjustments.store');

    Route::get('kategori', [CategoryController::class, 'index'])->name('categories.index');
    Route::post('kategori', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('kategori/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('kategori/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');
});
