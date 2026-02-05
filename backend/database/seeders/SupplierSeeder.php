<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Services\Qlib;

class SupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissionId = \Illuminate\Support\Facades\DB::table('permissions')->where('name', 'Fornecedores')->value('id') ?? 6;

        $suppliers = [
            [
                'name' => 'IZA Seguradora S.A.',
                'email' => 'contato@iza.com.br', // Mock email
                'password' => Hash::make('password'),
                'permission_id' => $permissionId, // Supplier role
                'ativo' => 's',
                'status' => 'actived',
                'cnpj' => '40.004.544/0001-46',
                'tipo_pessoa' => 'pj',
                'genero' => 'ni',
                'verificado' => 's',
                'excluido' => 'n',
                'deletado' => 'n',
                // 'token' => Qlib::token(), // token is generated if not provided usually, or we can leave it
                'config' => json_encode([
                    'cod_susep' => '0457-0',
                    'registro_susep' => [
                        '15414.619412/2020-85 (Produto Acidente Pessoal)',
                        '15414.644857/2024-27 (Produto Seguro Viagem)',
                        '15414.616755/2025-01 (Produto Vida em Grupo Taxa Média)',
                        '15414.617802/2025-25 (Acidente Pessoal Coletivo)'
                    ],
                    'autorizacao' => 'Autorizada pela Susep a atuar como seguradora independente',
                    'tag' => 'IZA',
                ]),
            ],
            [
                'name' => 'Sul América Seguros de Pessoas e Previdência S.A.',
                'email' => 'contato@sulamerica.com.br', // Mock email
                'password' => Hash::make('password'),
                'permission_id' => $permissionId, // Supplier role
                'ativo' => 's',
                'status' => 'actived',
                'cnpj' => '01.704.513/0001-46',
                'tipo_pessoa' => 'pj',
                'genero' => 'ni',
                'verificado' => 's',
                'excluido' => 'n',
                'deletado' => 'n',
                // 'token' => Qlib::token(),
                'config' => json_encode([
                    'sac' => '0800 722 0504',
                    'sac_deficiencia' => 'Pessoas com Deficiência Auditiva e na Fala - 24H',
                    'whatsapp' => '(11) 3004-9723',
                    'tag' => 'SulAmerica'
                ]),
            ],
            [
                'name' => 'LSX MEDICAL',
                'razao' => 'LSX Participações LTDA',
                'email' => 'contato@lsxmedical.com',
                'password' => Hash::make('password'),
                'permission_id' => $permissionId,
                'ativo' => 's',
                'status' => 'actived',
                'cnpj' => '43.716.546/0001-56',
                'tipo_pessoa' => 'pj',
                'genero' => 'ni',
                'verificado' => 's',
                'excluido' => 'n',
                'deletado' => 'n',
                'foto_perfil' => 'suppliers/lsx_medical.png',
                'config' => json_encode([
                    'address' => 'Alameda Dr. Carlos de Carvalho, 431 12. andar, Curitiba, PR',
                    'tag' => 'LSX'
                ]),
            ]
        ];

        $tableName = 'users';

        foreach ($suppliers as $data) {
            // Ensure token is set if needed (though Qlib::token() was used in original, we can re-add if we want it fresh every time, but updateOrCreate might keep old one if we don't pass it. Let's add it if creating.)
             if (!isset($data['token'])) {
                $data['token'] = Qlib::token();
            }

            // Filter fields
            $validData = array_filter($data, function ($key) use ($tableName) {
                return \Illuminate\Support\Facades\Schema::hasColumn($tableName, $key);
            }, ARRAY_FILTER_USE_KEY);

            User::updateOrCreate(
                ['email' => $data['email']],
                $validData
            );
        }
    }
}
