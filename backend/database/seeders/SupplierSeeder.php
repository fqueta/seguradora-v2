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
        // 1 - IZA Seguradora S.A.
        User::create([
            'name' => 'IZA Seguradora S.A.',
            'email' => 'contato@iza.com.br', // Mock email
            'password' => Hash::make('password'),
            'permission_id' => 6, // Supplier role
            'ativo' => 's',
            'status' => 'actived',
            'cnpj' => '40.004.544/0001-46',
            'tipo_pessoa' => 'pj',
            'token' => Qlib::token(),
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
        ]);

        // 2 - Sul América Seguros de Pessoas e Previdência S.A.
        User::create([
            'name' => 'Sul América Seguros de Pessoas e Previdência S.A.',
            'email' => 'contato@sulamerica.com.br', // Mock email
            'password' => Hash::make('password'),
            'permission_id' => 6, // Supplier role
            'ativo' => 's',
            'status' => 'actived',
            'cnpj' => '01.704.513/0001-46',
            'tipo_pessoa' => 'pj',
            'token' => Qlib::token(),
            'config' => json_encode([
                'sac' => '0800 722 0504',
                'sac_deficiencia' => 'Pessoas com Deficiência Auditiva e na Fala - 24H',
                'whatsapp' => '(11) 3004-9723',
                'tag' => 'SulAmerica'
            ]),
        ]);
    }
}
