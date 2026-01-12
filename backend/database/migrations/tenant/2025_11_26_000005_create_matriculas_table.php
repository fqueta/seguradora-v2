<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Recreates the matriculas table which was missing.
     * Based on inferred schema from models and subsequent migrations.
     */
    public function up(): void
    {
        Schema::create('matriculas', function (Blueprint $table) {
            $table->increments('id');

            // Foreign keys / IDs
            // id_cliente assumed string/uuid initially or converted? 
            // Given Client extends User (UUID), this should be string. 
            // However, subsequent migrations fix id_responsavel from Int to String, implying Int history.
            // If we make id_cliente string now, it is safer for current state.
            $table->string('id_cliente', 36)->nullable(); 
            
            $table->integer('id_curso')->nullable();
            
            // History suggests this was integer, then altered to text in 2025_11_29_000100
            $table->integer('id_responsavel')->nullable(); 
            
            $table->integer('id_turma')->nullable();
            // parcelamento_id is added in 2025_12_02_000600_add_parcelamento_id_to_matriculas.php
            // situacao_id is added in 2025_12_01_000400_add_situacao_id_to_matriculas.php

            // History suggests this was integer, likely altered later (2025_11_29_000200)
            $table->integer('id_consultor')->nullable(); 
            
            $table->integer('funnel_id')->nullable();
            
            // Critical for next migration (rename_etapa_to_stage_id)
            $table->integer('etapa')->nullable(); 

            // Text/Data
            $table->text('descricao')->nullable();
            
            // History suggests this was passed as integer in previous versions (down method of 2025_12_01_000300)
            $table->integer('status')->nullable();
            
            $table->json('config')->nullable();
            $table->json('orc')->nullable();
            
            // Financials
            $table->decimal('desconto', 12, 2)->default(0);
            $table->decimal('combustivel', 12, 2)->default(0);
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);

            // Flags
            $table->enum('ativo', ['s', 'n'])->default('n');
            
            // Soft Deletes
            $table->enum('excluido', ['n', 's'])->default('n');
            $table->enum('deletado', ['n', 's'])->default('n');
            $table->text('excluido_por')->nullable();
            $table->text('deletado_por')->nullable();
            $table->json('reg_excluido')->nullable();
            $table->json('reg_deletado')->nullable();

            // Timestamps
            // Using explicit columns as per model constants
            $table->timestamp('data')->useCurrent();
            $table->timestamp('atualizado')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matriculas');
    }
};
