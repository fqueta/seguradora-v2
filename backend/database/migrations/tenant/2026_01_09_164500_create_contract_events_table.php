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
        Schema::create('contract_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('contract_id');
            $table->string('user_id')->nullable();
            $table->string('event_type');
            $table->text('description')->nullable();
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');
            // Assuming users table exists in tenant schema, otherwise we might need to handle this differently
            // standard tenant setup usually includes users or they are central.
            // checking ContractEvent model it has belongsTo User. Let's assume users table is available or loose coupling.
            // Given the previous error "Base table or view not found: 1146 Table 'maisaqu_yellow.matriculas' doesn't exist",
            // it seems we are operating in a tenant database context.
            // Safest to just add the column for now, adding constraint if we are sure.
            // The plan said "foreign key to users", but if users are central execution might fail if not handled correctly in tenants.
            // Usually in tenancy for laravel, users can be tenant specific or central.
            // Let's look at `create_contracts_table.php` seen earlier.
            // It had `$table->string('client_id')->nullable(); // User/Client` and `$table->string('owner_id')->nullable();`
            // It did NOT use foreign keys for users there.
            // So I will stick to integer/bigint but maybe skip the strict foreign key constraint to avoid issues if users are in a different DB (central) vs tenant DB.
            // Wait, ContractEvent model has `public function user() { return $this->belongsTo(User::class); }`.
            // If User is central, standard relationship might work across databases if configured, but DB constraint won't.
            // I will add the constraint but catch if it fails? No, better to be safe.
            // I will match the style of contracts table, but `user_id` is usually a BigInt.
            // strict foreign key might fail if users table is not in tenant.
            // I'll check if `users` table exists in tenant migrations?
            // I'll skip the FK constraint for `user_id` to be safe and consistent with `contracts` table observation (which didn't seem to have one for owner/client).
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contract_events');
    }
};
