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
                    'name' => 'FULLLIFE DIGITAL HEALTH LTDA',
                    'document' => '63.121.689/0001-22',
                    'email' => 'douglas.alvares@gmail.com',
                    'phone' => null,
                    'address' => null,
                    'active' => true,
                    'config' => [
                        'cep' => null,
                        'endereco' => 'Travessa Antônio Francisco Alves',
                        'numero' => '52',
                        'complemento' => 'Apto 401',
                        'bairro' => 'Ingleses do Rio Vermelho',
                        'cidade' => 'Florianópolis',
                        'uf' => 'SC',
                        'allowed_products' => ['12'],
                    ],
                ],
                [
                    'name' => 'MEDIGO ASSESSORIA MEDICA EM EDUCACAO S/A ',
                    'document' => '46.432.496/0001-73',
                    'email' => 'lucas.costa@mymedgo.com.br',
                    'phone' => null,
                    'address' => null,
                    'active' => true,
                    'config' => [
                        'cep' => '30110-013',
                        'endereco' => 'Avenida do Contorno',
                        'numero' => '4747',
                        'complemento' => 'Sala 805',
                        'bairro' => 'Santa Efigênia',
                        'cidade' => 'Belo Horizonte',
                        'uf' => 'MG',
                        'allowed_products' => ['12'],
                    ],
                ],
                [
                    'name' => 'Matriz Yellow BC',
                    'document' => '12345678000199',
                    'email' => 'yellowbcompany@gmail.com',
                    'phone' => '11999999999',
                    'address' => 'Rua Exemplo, 123',
                    'active' => true,
                    'config' => [
                        'cep' => null,
                        'endereco' => null,
                        'numero' => null,
                        'complemento' => null,
                        'bairro' => null,
                        'cidade' => null,
                        'uf' => null,
                        'allowed_products' => ['12', '9', '10'],
                    ],
                ],
                [
                    'name' => 'Mileto Servicos de Televisao por Assinatura S.A.',
                    'document' => '53.059.901/0001-15',
                    'email' => 'resgates.antenamais@oitv.net',
                    'phone' => null,
                    'address' => null,
                    'active' => true,
                    'config' => [
                        'cep' => '22461-000',
                        'endereco' => 'Rua Jardim Botânico',
                        'numero' => '518',
                        'complemento' => 'Sala 401',
                        'bairro' => 'Jardim Botânico',
                        'cidade' => 'Rio de Janeiro',
                        'uf' => 'RJ',
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
