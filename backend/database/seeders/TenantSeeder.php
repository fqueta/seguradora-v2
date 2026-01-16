<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Stancl\Tenancy\Database\Models\Domain;

class TenantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenantId = 'yellow';
        $domain = 'yellow.localhost';

        $tenant = Tenant::find($tenantId);

        if (!$tenant) {
            try {
                $tenant = Tenant::create([
                    'id' => $tenantId,
                    'name' => 'Yellow Seguradora',
                    'ativo' => 's',
                    'excluido' => 'n',
                    'reg_excluido' => 'n',
                    'deletado' => 'n',
                    'reg_deletado' => 'n',
                    'autor' => 'system',
                ]);
                $this->command->info("Tenant '{$tenantId}' created.");
            } catch (\Stancl\Tenancy\Exceptions\TenantDatabaseAlreadyExistsException $e) {
                $this->command->warn("Tenant database '{$tenantId}' already exists. Creating tenant record without database creation.");
                $tenant = new Tenant();
                $tenant->fill([
                    'id' => $tenantId,
                    'name' => 'Yellow Seguradora',
                    'ativo' => 's',
                    'excluido' => 'n',
                    'reg_excluido' => 'n',
                    'deletado' => 'n',
                    'reg_deletado' => 'n',
                    'autor' => 'system',
                ]);
                $tenant->saveQuietly();
                $this->command->info("Tenant '{$tenantId}' record restored.");
            }
        } else {
            $this->command->info("Tenant '{$tenantId}' already exists.");
        }

        // Check if domain exists
        $domainExists = $tenant->domains()->where('domain', $domain)->exists();
        
        if (!$domainExists) {
             $tenant->domains()->create([
                'domain' => $domain
            ]);
            $this->command->info("Domain '{$domain}' created for tenant '{$tenantId}'.");
        } else {
             $this->command->info("Domain '{$domain}' already exists for tenant '{$tenantId}'.");
        }
    }
}
