<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Anggota pada penjualan hanya penanda (opsional); tanpa diskon atau poin. */
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('member_id')->nullable()->after('cash_shift_id')->constrained('members');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('member_id');
        });
    }
};
