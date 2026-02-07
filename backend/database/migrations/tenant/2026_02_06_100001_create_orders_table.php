<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('status', 32)->default('pending')->index();
            $table->string('fulfillment_type', 32)->default('pickup')->index();
            $table->string('payment_method', 32)->default('card')->index();
            $table->string('customer_name')->index();
            $table->string('customer_phone')->index();
            $table->json('delivery_address')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->string('token')->nullable()->unique();
            $table->json('config')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
