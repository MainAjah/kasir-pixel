<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ledger simpanan. Hanya bisa ditambah (dijaga oleh model dan satu pintu PostSaving).
     * Perlindungan hanya di aplikasi, tanpa trigger database.
     */
    public function up(): void
    {
        Schema::create('savings_ledger', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('member_id')->constrained();
            $table->string('savings_type', 20);
            $table->string('entry_type', 20);
            // Bertanda: + setor, - tarik. Rupiah bulat.
            $table->bigInteger('amount');
            // Saldo anggota untuk jenis ini sesudah baris ini (tidak pernah minus).
            $table->unsignedBigInteger('balance_after');
            // Bulan yang dibayar (tanggal 1), hanya untuk simpanan wajib.
            $table->date('period')->nullable();
            $table->foreignId('reverses_entry_id')->nullable()->unique()->constrained('savings_ledger');
            $table->string('note')->nullable();
            $table->dateTime('occurred_at');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at')->nullable();

            $table->index(['member_id', 'savings_type', 'id']);
            $table->index(['member_id', 'period']);
        });

        DB::statement('ALTER TABLE savings_ledger ADD CONSTRAINT savings_ledger_amount_nonzero CHECK (amount <> 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('savings_ledger');
    }
};
