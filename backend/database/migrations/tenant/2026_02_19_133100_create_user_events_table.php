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
        Schema::create('user_events', function (Blueprint $table) {
            $table->id();
            $table->string('user_id'); // Target User UUID (from users table)
            $table->string('author_id')->nullable(); // Action Author UUID (who performed the action)
            $table->string('event_type');
            $table->text('description')->nullable();
            $table->json('from_data')->nullable();
            $table->json('to_data')->nullable();
            $table->json('metadata')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            // Indexes for faster lookups
            $table->index('user_id');
            $table->index('event_type');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_events');
    }
};
