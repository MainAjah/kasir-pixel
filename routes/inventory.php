<?php

use App\Http\Controllers\Inventory\CategoryController;
use App\Http\Controllers\Inventory\ProductController;
use App\Http\Controllers\Inventory\ProductImageController;
use App\Http\Controllers\Inventory\StockAdjustmentController;
use App\Http\Controllers\Inventory\StockCardController;
use App\Http\Controllers\Inventory\StockOutController;
use App\Http\Controllers\Inventory\StockReceiptController;
use App\Http\Controllers\Inventory\SupplierController;
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
    // Gambar barang untuk kartu kasir dan rak diorama.
    Route::post('produk/{product}/gambar', [ProductImageController::class, 'store'])->name('products.image.store');
    Route::delete('produk/{product}/gambar', [ProductImageController::class, 'destroy'])->name('products.image.destroy');

    Route::get('penerimaan-barang', [StockReceiptController::class, 'index'])->name('stock-receipts.index');
    Route::get('penerimaan-barang/baru', [StockReceiptController::class, 'create'])->name('stock-receipts.create');
    Route::post('penerimaan-barang', [StockReceiptController::class, 'store'])->name('stock-receipts.store');
    // Detail penerimaan (Tahap 5E-2): hanya membaca.
    Route::get('penerimaan-barang/{stockEntry}', [StockReceiptController::class, 'show'])
        ->whereNumber('stockEntry')->name('stock-receipts.show');

    // Tab Stok Keluar di halaman Inventaris (Tahap 5E-2): hanya membaca ledger.
    Route::get('stok-keluar', [StockOutController::class, 'index'])->name('stock-out.index');

    Route::get('koreksi-stok', [StockAdjustmentController::class, 'create'])->name('stock-adjustments.create');
    Route::post('koreksi-stok', [StockAdjustmentController::class, 'store'])->name('stock-adjustments.store');

    // Supplier (Tahap 6B): data master, dinonaktifkan bukan dihapus.
    Route::get('supplier', [SupplierController::class, 'index'])->name('suppliers.index');
    Route::get('supplier/baru', [SupplierController::class, 'create'])->name('suppliers.create');
    Route::post('supplier', [SupplierController::class, 'store'])->name('suppliers.store');
    Route::get('supplier/{supplier}/ubah', [SupplierController::class, 'edit'])->name('suppliers.edit');
    Route::put('supplier/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update');
    Route::post('supplier/{supplier}/nonaktifkan', [SupplierController::class, 'deactivate'])->name('suppliers.deactivate');
    Route::post('supplier/{supplier}/aktifkan', [SupplierController::class, 'activate'])->name('suppliers.activate');

    Route::get('kategori', [CategoryController::class, 'index'])->name('categories.index');
    Route::post('kategori', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('kategori/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('kategori/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');
});
