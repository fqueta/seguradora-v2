<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'ativo')) {
                $table->enum('ativo', ['s', 'n'])->default('s'); // Assuming 's'/'n' based on other tables or boolean
            }
            // Or if it should be boolean, but User model fillable has 'ativo' and PermissionSeeder used 'active' => 's'.
            // Let's assume 's'/'n' as per standard in this project (PermissionSeeder).
            
            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status')->nullable();
            }
            if (!Schema::hasColumn('users', 'tipo_pessoa')) {
                $table->string('tipo_pessoa')->nullable();
            }
            if (!Schema::hasColumn('users', 'verificado')) {
                $table->enum('verificado', ['s', 'n'])->default('n');
            }
             if (!Schema::hasColumn('users', 'config')) {
                $table->json('config')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = ['ativo', 'status', 'tipo_pessoa', 'verificado', 'config'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
