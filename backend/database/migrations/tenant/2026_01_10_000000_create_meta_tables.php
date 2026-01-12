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
        if (!Schema::hasTable('postmeta')) {
            Schema::create('postmeta', function (Blueprint $table) {
                $table->id();
                $table->string('post_id')->nullable();
                $table->text('meta_key')->nullable();
                $table->longText('meta_value')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('contract_meta')) {
            Schema::create('contract_meta', function (Blueprint $table) {
                $table->id();
                $table->string('contract_id')->nullable();
                $table->text('meta_key')->nullable();
                $table->longText('meta_value')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('postmeta');
        Schema::dropIfExists('contract_meta');
    }
};
