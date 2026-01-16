<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    /**
     * Upgrades client_attendances foreign key fields to VARCHAR(36) for UUIDs.
     * Atualiza os campos client_id e attended_by para VARCHAR(36) (UUID).
     */
    public function up(): void
    {
        // Drop indexes if present to avoid conflicts during type change
        Schema::table('client_attendances', function (Blueprint $table) {
            try { $table->dropIndex('client_attendances_client_id_index'); } catch (\Throwable $e) {}
            try { $table->dropIndex('client_attendances_attended_by_index'); } catch (\Throwable $e) {}
        });

        // Widen columns to VARCHAR(36)
        Schema::table('client_attendances', function (Blueprint $table) {
            $table->string('client_id', 36)->change();
            $table->string('attended_by', 36)->change();
        });

        // Recreate indexes
        Schema::table('client_attendances', function (Blueprint $table) {
            $table->index('client_id');
            $table->index('attended_by');
        });
    }

    /**
     * Reverts fields back to VARCHAR(26) (ULID) if needed.
     * Reverte para VARCHAR(26) caso necessário.
     */
    public function down(): void
    {
        try { DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_client_id_index`'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE `client_attendances` DROP INDEX `client_attendances_attended_by_index`'); } catch (\Throwable $e) {}

        Schema::table('client_attendances', function (Blueprint $table) {
            $table->string('client_id', 26)->change();
            $table->string('attended_by', 26)->change();
        });
        
        Schema::table('client_attendances', function (Blueprint $table) {
            $table->index('client_id');
            $table->index('attended_by');
        });
    }
};