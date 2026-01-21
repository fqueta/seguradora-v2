<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Sanitiza valores inválidos em users.client_permission no contexto tenant.
     * - Define '[]' quando for NULL, vazio ou JSON inválido (SQLite JSON1).
     */
    public function up(): void
    {
        // SQLite: json_valid retorna 1 para JSON válido
        DB::statement("
            UPDATE users
            SET client_permission = '[]'
            WHERE client_permission IS NULL
               OR TRIM(client_permission) = ''
               OR json_valid(client_permission) = 0
        ");
    }

    /**
     * Sem reversão específica; valores sanitizados permanecem consistentes.
     */
    public function down(): void
    {
        // no-op
    }
};

