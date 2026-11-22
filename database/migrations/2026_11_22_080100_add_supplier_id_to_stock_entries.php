<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Penerimaan barang boleh menunjuk supplier (opsional, Tahap 6B). Kolom
     * supplier_name tetap: salinan nama saat penerimaan, atau teks bebas bila
     * supplier tidak dipilih. Penerimaan lama tidak berubah.
     */
    public function up(): void
    {
        Schema::table('stock_entries', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->after('number')->constrained('suppliers');
        });
    }

    public function down(): void
    {
        Schema::table('stock_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('supplier_id');
        });
    }
};
