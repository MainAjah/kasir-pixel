<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Penjualan dibuat sekali dalam keadaan selesai dan tidak pernah diubah.
     * Pembatalan dicatat di sale_voids. Tanpa diskon dan tanpa member_id (ditunda).
     */
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('cash_shift_id')->constrained();
            $table->unsignedBigInteger('total');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained();
            $table->foreignId('product_id')->constrained();
            $table->foreignId('product_unit_id')->constrained();
            // Salinan agar struk lama tetap benar walau produk diubah.
            $table->string('product_name');
            $table->string('unit_name');
            $table->unsignedInteger('conversion');
            $table->unsignedInteger('qty');
            $table->unsignedInteger('base_qty');
            $table->unsignedBigInteger('unit_price');
            $table->unsignedBigInteger('line_total');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained();
            $table->string('method', 20);
            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('tendered');
            $table->unsignedBigInteger('change');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sale_voids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->unique()->constrained();
            $table->string('reason');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_voids');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
    }
};
