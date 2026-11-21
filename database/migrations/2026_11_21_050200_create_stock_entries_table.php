<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catatan penerimaan barang. Tanpa saldo: stok hanya ada di stock_movements.
     */
    public function up(): void
    {
        Schema::create('stock_entries', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->string('supplier_name')->nullable();
            $table->text('note')->nullable();
            $table->dateTime('occurred_at');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_entries');
    }
};
