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
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('contract_number')->nullable();
            $table->string('client_id')->nullable(); // User/Client (using string for flexibility if UUIDs are used elsewhere, but typically unsignedBigInteger or uuid)
            $table->string('owner_id')->nullable(); // User/Owner
            $table->string('product_id')->nullable();
            $table->string('status')->default('pending'); // pending, active, cancelled
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('c_number')->nullable(); // C. from image
            $table->text('description')->nullable();
            $table->decimal('value', 15, 2)->nullable();
            $table->string('file_path')->nullable();
            $table->string('type')->default('PF'); // PF or PJ
            $table->json('address')->nullable(); // Store address snapshot
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
