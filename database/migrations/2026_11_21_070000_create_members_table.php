<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            // A-000123. Tidak pernah dipakai ulang: baris anggota hanya di-soft-delete, tidak dihapus permanen.
            $table->string('member_number')->unique();
            $table->string('name');
            $table->string('phone', 30)->nullable();
            $table->string('address')->nullable();
            $table->date('joined_at');
            $table->string('status', 20)->default('active');
            $table->date('exited_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
