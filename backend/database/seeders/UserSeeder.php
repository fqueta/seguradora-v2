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
        $payload = [
            'data' => [
                [
                    'id' => '019bd8df-b9bb-7300-9434-de90617c7032',
                    'tipo_pessoa' => 'pf',
                    'name' => 'Fernando Queta',
                    'razao' => null,
                    'cpf' => null,
                    'cnpj' => null,
                    'email' => 'fernando@maisaqui.com.br',
                    'celular' => null,
                    'email_verified_at' => null,
                    'status' => 'actived',
                    'genero' => 'ni',
                    'verificado' => 'n',
                    'permission_id' => 1,
                    'config' => null,
                    'preferencias' => null,
                    'foto_perfil' => null,
                    'ativo' => 's',
                    'autor' => null,
                    'excluido' => 'n',
                    'reg_excluido' => null,
                    'deletado' => 'n',
                    'reg_deletado' => null,
                    'organization_id' => null,
                    'client_permission' => null,
                ],
                [
                    'id' => '019bd8df-b9c8-734b-92d9-99a3612aa6e9',
                    'tipo_pessoa' => 'pf',
                    'name' => 'Developer',
                    'razao' => '',
                    'cpf' => null,
                    'cnpj' => null,
                    'email' => 'fernando@mastertechbr.com',
                    'celular' => null,
                    'email_verified_at' => null,
                    'status' => 'actived',
                    'genero' => 'ni',
                    'verificado' => 'n',
                    'permission_id' => 1,
                    'config' => [
                        'celular' => '',
                        'telefone_comercial' => '',
                        'nascimento' => '',
                        'cep' => '',
                        'endereco' => '',
                        'numero' => '',
                        'complemento' => '',
                        'bairro' => '',
                        'cidade' => '',
                        'uf' => '',
                        'nome_fantasia' => '',
                        'telefone_residencial' => '',
                        'rg' => '',
                        'escolaridade' => '',
                        'profissao' => '',
                        'tipo_pj' => '',
                    ],
                    'preferencias' => null,
                    'foto_perfil' => null,
                    'ativo' => 's',
                    'autor' => '019bd8df-b9c8-734b-92d9-99a3612aa6e9',
                    'excluido' => 'n',
                    'reg_excluido' => null,
                    'deletado' => 'n',
                    'reg_deletado' => null,
                    'organization_id' => null,
                    'client_permission' => [],
                ],
            ],
        ];

        $tableName = (new User())->getTable();

        foreach ($payload['data'] as $userData) {
            if (!isset($userData['password'])) {
                $userData['password'] = Hash::make('password');
            }
            // Filter fields that exist in the table
            $validData = array_filter($userData, function ($key) use ($tableName) {
                return \Illuminate\Support\Facades\Schema::hasColumn($tableName, $key);
            }, ARRAY_FILTER_USE_KEY);

            User::updateOrCreate(
                ['email' => $userData['email']],
                $validData
            );
        }
    }
}
