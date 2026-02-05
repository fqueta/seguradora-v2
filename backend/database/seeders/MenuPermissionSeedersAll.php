<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class MenuPermissionSeedersAll extends Seeder
{
    /**
     * Executa todas as seeders de permissões de menu de uma só vez.
     */
    public function run(): void
    {
        $this->call([
            MenuPermissionSeederAdmin::class,
            MenuPermissionSeederDiretor::class,
            MenuPermissionSeederVendedor::class,
            MenuPermissionSeederEscritorio::class,
        ]);
    }
}
