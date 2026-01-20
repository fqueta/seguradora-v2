<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adiciona o campo JSON client_permission na tabela users (projeto principal).
 * Permite associar múltiplas permissões de uso ao usuário.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'client_permission')) {
                $table->json('client_permission')->nullable()->after('permission_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'client_permission')) {
                $table->dropColumn('client_permission');
            }
        });
    }
};

