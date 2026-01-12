<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Recreates the missing activity_progress table.
     */
    public function up(): void
    {
        Schema::create('activity_progress', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('activity_id')->nullable();
            $table->integer('course_id')->nullable();
            $table->integer('id_matricula')->nullable();
            $table->integer('module_id')->nullable();
            $table->integer('seconds')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_progress');
    }
};
