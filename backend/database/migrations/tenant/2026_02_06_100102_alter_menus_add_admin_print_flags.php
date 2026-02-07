<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * pt-BR: Adiciona flags de visibilidade/admin e impressão na tabela menus.
     * en-US: Adds visibility/admin and printing flags to menus table.
     */
    public function up(): void
    {
        Schema::table('menus', function (Blueprint $table) {
            $table->boolean('is_admin_only')->default(false)->after('active');
            $table->boolean('printable')->default(false)->after('is_admin_only');
            $table->string('print_template', 32)->nullable()->after('printable');
        });
    }

    public function down(): void
    {
        Schema::table('menus', function (Blueprint $table) {
            $table->dropColumn(['is_admin_only', 'printable', 'print_template']);
        });
    }
};
