<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->dateTime('opened_at');
            $table->unsignedBigInteger('opening_cash');
            // Null = shift masih aktif. Setelah terisi, baris tidak diubah lagi.
            $table->dateTime('closed_at')->nullable();
            $table->unsignedBigInteger('counted_cash')->nullable();
            $table->unsignedBigInteger('expected_cash')->nullable();
            // Bertanda: counted_cash - expected_cash.
            $table->bigInteger('difference')->nullable();
            $table->text('closing_note')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'closed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_shifts');
    }
};
