<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * up
     * pt-BR: Adiciona campos administrativos e de impressão à tabela orders.
     * en-US: Adds administrative and printing fields to orders table.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('admin_notes')->nullable()->after('notes');
            $table->text('kitchen_notes')->nullable()->after('admin_notes');
            $table->string('priority', 16)->default('normal')->index()->after('payment_method');
            $table->string('print_status', 16)->nullable()->index()->after('status'); // queued|printed|failed
            $table->unsignedSmallInteger('print_copies')->default(1)->after('config');
            $table->string('print_template', 32)->nullable()->after('config'); // receipt|kitchen
            $table->timestamp('printed_at')->nullable()->after('updated_at');
        });
    }

    /**
     * down
     * pt-BR: Remove os campos adicionados.
     * en-US: Drops the added fields.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'admin_notes',
                'kitchen_notes',
                'priority',
                'print_status',
                'print_copies',
                'print_template',
                'printed_at',
            ]);
        });
    }
};
