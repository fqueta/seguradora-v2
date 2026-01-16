<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Services\Qlib;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = [
            [
                // 'id' => Qlib::token(),
                'name' => 'Fernando Queta',
                'email' => 'fernando@maisaqui.com.br',
                'password' => Hash::make('ferqueta'),
                'status' => 'actived',
                'verificado' => 'n',
                'permission_id' => 1, // Grupo Master
                'tipo_pessoa' => 'pf',
                'genero' => 'ni',
                'ativo' => 's',
                'excluido' => 'n',
                'deletado' => 'n',
            ],
            [
                // 'id' => Qlib::token(),
                'name' => 'Admin User',
                'email' => 'ger.maisaqui1@gmail.com',
                'password' => Hash::make('mudar123'),
                'status' => 'actived',
                'verificado' => 'n',
                'permission_id' => 2, // Grupo Administrador
                'tipo_pessoa' => 'pf',
                'genero' => 'ni',
                'ativo' => 's',
                'excluido' => 'n',
                'deletado' => 'n',
            ],
        ];

        $tableName = (new User())->getTable();

        foreach ($users as $userData) {
            // Filter fields that exist in the table
            $validData = array_filter($userData, function ($key) use ($tableName) {
                return \Illuminate\Support\Facades\Schema::hasColumn($tableName, $key);
            }, ARRAY_FILTER_USE_KEY);

            // dump($userData);
            // User::create(
            //     $validData
            // );
            User::updateOrCreate(
                ['email' => $userData['email']],
                $validData
            );
        }
    }
}
