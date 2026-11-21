<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            // Batas stok minimum, dalam satuan dasar.
            $table->unsignedInteger('min_stock')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('product_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            // Isi satuan dasar per satuan ini (dus = 24). Satuan dasar = 1.
            $table->unsignedInteger('conversion');
            $table->boolean('is_base')->default(false);
            // Harga jual per satuan ini, rupiah bulat.
            $table->unsignedBigInteger('sell_price');
            // Satu kolom barcode unik (keputusan Q1). Null berarti tanpa barcode.
            $table->string('barcode')->nullable()->unique();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['product_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_units');
        Schema::dropIfExists('products');
    }
};
