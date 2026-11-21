<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ledger stok. Hanya bisa ditambah (dijaga oleh model dan satu pintu AdjustStock).
     */
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained();
            $table->string('type', 20);
            // Satuan dasar. Bertanda: + masuk, - keluar.
            $table->integer('qty');
            // Saldo produk sesudah mutasi ini.
            $table->unsignedInteger('balance_after');
            // Apa yang diketik pengguna (misalnya 2 dus). qty = input_qty * conversion.
            $table->foreignId('input_unit_id')->constrained('product_units');
            $table->integer('input_qty');
            $table->unsignedBigInteger('cost_total')->nullable();
            $table->foreignId('stock_entry_id')->nullable()->constrained('stock_entries');
            // Diisi Tahap 3. FK ke sale_items ditambahkan di migration Tahap 3.
            $table->unsignedBigInteger('sale_item_id')->nullable()->index();
            $table->foreignId('reverses_movement_id')->nullable()->unique()
                ->constrained('stock_movements');
            $table->string('note')->nullable();
            $table->dateTime('occurred_at');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at')->nullable();

            $table->index(['product_id', 'id']);
        });

        DB::statement('ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_qty_nonzero CHECK (qty <> 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
