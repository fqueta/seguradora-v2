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
        // 1. Create or Find Organization
        $organization = Organization::firstOrCreate(
            ['document' => '12345678000199'], // Example CNPJ/Document
            [
                'name' => 'Organização Exemplo',
                'email' => 'contato@exemplo.com',
                'phone' => '11999999999',
                'address' => 'Rua Exemplo, 123',
                'active' => true,
                'config' => [],
            ]
        );

        $this->command->info("Organization '{$organization->name}' (ID: {$organization->id}) is ready.");

        // 2. Find Permission (e.g., Master or Administrador)
        // Adjust the name based on your PermissionSeeder (Master, Administrador, etc.)
        $permissionName = 'Master'; 
        $permission = Permission::where('name', $permissionName)->first();

        if (!$permission) {
            $this->command->error("Permission '{$permissionName}' not found. Please run PermissionSeeder first.");
            return;
        }

        // 3. Create User
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
