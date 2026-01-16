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
        // 1. Create permissions table
        if (!Schema::hasTable('permissions')) {
            Schema::create('permissions', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('guard_name')->default('web');
                $table->string('description')->nullable();
                $table->string('redirect_login')->nullable();
                $table->string('active')->default('s'); // 's' or 'n'
                $table->enum('excluido', ['n', 's'])->default('n');
                $table->enum('deletado', ['n', 's'])->default('n');
                $table->timestamps();
            });
        }

        // 2. Update menus table
        if (Schema::hasTable('menus')) {
            Schema::table('menus', function (Blueprint $table) {
                if (!Schema::hasColumn('menus', 'title')) {
                    $table->string('title')->nullable();
                }
                if (!Schema::hasColumn('menus', 'url')) {
                    $table->string('url')->nullable();
                }
                if (!Schema::hasColumn('menus', 'icon')) {
                    $table->string('icon')->nullable();
                }
                if (!Schema::hasColumn('menus', 'items')) {
                    $table->json('items')->nullable();
                }
                if (!Schema::hasColumn('menus', 'active')) {
                    $table->enum('active', ['y', 'n'])->default('y');
                }
                if (!Schema::hasColumn('menus', 'order')) {
                    $table->integer('order')->default(0);
                }
                if (!Schema::hasColumn('menus', 'parent_id')) {
                    $table->foreignId('parent_id')->nullable()->constrained('menus')->onDelete('cascade');
                }
            });
        }

        // 3. Create menu_permission table
        if (!Schema::hasTable('menu_permission')) {
            Schema::create('menu_permission', function (Blueprint $table) {
                $table->id();
                $table->foreignId('menu_id')->constrained('menus')->onDelete('cascade');
                $table->foreignId('permission_id')->constrained('permissions')->onDelete('cascade');
                $table->boolean('can_view')->default(false);
                $table->boolean('can_create')->default(false);
                $table->boolean('can_edit')->default(false);
                $table->boolean('can_delete')->default(false);
                $table->boolean('can_upload')->default(false);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_permission');
        
        if (Schema::hasTable('menus')) {
             Schema::table('menus', function (Blueprint $table) {
                // We won't drop columns to avoid data loss if rolling back, 
                // or you can implement dropColumn if desired.
             });
        }

        Schema::dropIfExists('permissions');
    }
};
