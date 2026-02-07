<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class OrganizationUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $payload = [
            'data' => [
                [
                    'name' => 'Demostração',
                    'document' => '99.999.999/0001-99',
                    'email' => 'demo@example.com',
                    'phone' => '11999999999',
                    'address' => 'Rua Exemplo, 123',
                    'active' => true,
                    'config' => [
                        'cep' => null,
                        'endereco' => 'Rua Exemplo',
                        'numero' => '123',
                        'complemento' => null,
                        'bairro' => 'Centro',
                        'cidade' => 'São Paulo',
                        'uf' => 'SP',
                        'allowed_products' => ['12'],
                    ],
                ],
                [
                    'name' => 'Matriz',
                    'document' => '00.000.000/0001-00',
                    'email' => 'matriz@example.com',
                    'phone' => '11888888888',
                    'address' => 'Av. Principal, 1000',
                    'active' => true,
                    'config' => [
                        'cep' => null,
                        'endereco' => 'Av. Principal',
                        'numero' => '1000',
                        'complemento' => null,
                        'bairro' => 'Centro',
                        'cidade' => 'São Paulo',
                        'uf' => 'SP',
                        'allowed_products' => ['12'],
                    ],
                ],
            ],
        ];

        foreach ($payload['data'] as $org) {
            $organization = Organization::updateOrCreate(
                ['document' => $org['document'] ?? $org['name']],
                [
                    'name' => $org['name'],
                    'email' => $org['email'] ?? null,
                    'phone' => $org['phone'] ?? null,
                    'address' => $org['address'] ?? null,
                    'active' => $org['active'] ?? true,
                    'config' => $org['config'] ?? [],
                ]
            );
            $this->command->info("Organization '{$organization->name}' (ID: {$organization->id}) is ready.");
        }

        // 2. Find Permission (e.g., Master or Administrador)
        // Adjust the name based on your PermissionSeeder (Master, Administrador, etc.)
        $permissionName = 'Master';
        $permission = Permission::where('name', $permissionName)->first();

        if (!$permission) {
            $this->command->error("Permission '{$permissionName}' not found. Please run PermissionSeeder first.");
            return;
        }

        $userEmail = 'admin@exemplo.com';

        $user = User::where('email', $userEmail)->first();

        if (!$user) {
            $user = User::create([
                'name' => 'Admin User',
                'email' => $userEmail,
                'password' => Hash::make('password'), // Default password
                'organization_id' => $organization->id,
                'permission_id' => $permission->id,
                'ativo' => 's', // Changed from boolean and 'active' to match 'ativo' column and 's'/'n' pattern
                'status' => 'actived', // Changed from 'aprovado' to match enum
                'tipo_pessoa' => 'pf',
                'verificado' => 's',
                'genero' => 'ni', // Changed from 'outro' to match enum
                'ativo' => 's',
                'excluido' => 'n',
                'deletado' => 'n',
            ]);
            $this->command->info("User '{$user->name}' created with email '{$user->email}'.");
        } else {
            // Update existing user if needed
            $user->update([
                'organization_id' => $organization->id,
                'permission_id' => $permission->id,
            ]);
            $this->command->info("User '{$user->email}' already exists. Updated Link to Organization/Permission.");
        }
    }
}
