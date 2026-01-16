<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    /**
     * Ajusta os campos de chave para suportar IDs string (UUID/ULID) em client_attendances.
     */
    public function up(): void
    {
        // Remover índices para evitar erros ou duplicação
        Schema::table('client_attendances', function (Blueprint $table) {
            try {
                $table->dropIndex('client_attendances_client_id_index');
            } catch (\Throwable $e) {}
            try {
                $table->dropIndex('client_attendances_attended_by_index');
            } catch (\Throwable $e) {}
        });

        // Alterar tipos para VARCHAR(26) (ULID)
        Schema::table('client_attendances', function (Blueprint $table) {
            $table->string('client_id', 26)->change();
            $table->string('attended_by', 26)->change();
        });

        // Recriar índices
        Schema::table('client_attendances', function ($table) {
            $table->index('client_id');
            $table->index('attended_by');
        });
    }

    /**
     * Reverte os campos para BIGINT caso necessário.
     */
    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_client_id_index`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_attended_by_index`');
        } catch (\Throwable $e) {
        }

        Schema::table('client_attendances', function (Blueprint $table) {
            $table->unsignedBigInteger('client_id')->change();
            $table->unsignedBigInteger('attended_by')->change();
        });

        Schema::table('client_attendances', function ($table) {
            $table->index('client_id');
            $table->index('attended_by');
        });
    }
};