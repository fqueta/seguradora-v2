<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Str;

class IzaProductsSeeder extends Seeder
{
    /**
     * Run the database seeds for IZA products.
     * pt-BR: Cadastra os planos da IZA com base na tabela de homologação e produção.
     */
    public function run(): void
    {
        $supplier = User::where('name', 'like', 'IZA%')->first();
        if (!$supplier) {
            $this->command->error('Fornecedor IZA não encontrado!');
            return;
        }

        $plans = [
            [
                'name' => 'IZA PLANO 1 - COMBO',
                'hml_id' => '104',
                'prd_id' => '1656',
                'coberturas' => 'MA + IVA + FUN + REDE',
                'description' => 'YELLOW BENEFITS Plano 1 - Mensal - D24H',
            ],
            [
                'name' => 'IZA PLANO 2 - AP + FUN 7k',
                'hml_id' => '100',
                'prd_id' => '1657',
                'coberturas' => 'MA + IVA + FUN',
                'description' => 'YELLOW BENEFITS Plano 2 - Mensal - D24H',
            ],
            [
                'name' => 'IZA PLANO 3 - AP + REDE',
                'hml_id' => '101',
                'prd_id' => '1658',
                'coberturas' => 'MA + IVA + REDE',
                'description' => 'YELLOW BENEFITS Plano 3 - Mensal - D24H',
            ],
            [
                'name' => 'IZA PLANO 4 - AP',
                'hml_id' => '103',
                'prd_id' => '1659',
                'coberturas' => 'MA + IVA',
                'description' => 'YELLOW BENEFITS Plano 4 - Mensal - D24H',
            ],
        ];

        foreach ($plans as $plan) {
            $slug = Str::slug($plan['name']);
            
            $config = [
                'unit' => 'un',
                'image' => '',
                'availability' => 'available',
                'rating' => 0,
                'reviews' => 0,
                'terms' => [],
                'slug_parceiro' => $plan['hml_id'],
                'supplier_id' => $supplier->id,
                'tag' => 'Iza',
                'plan_id' => $plan['hml_id'], // Usando HML por padrão
                'iza_plan_id' => $plan['hml_id'],
                'iza_plan_id_prd' => $plan['prd_id'],
                'coberturas' => $plan['coberturas'],
                'description_long' => $plan['description'],
            ];

            Product::withoutGlobalScopes()->updateOrCreate(
                [
                    'post_name' => $slug,
                    'post_type' => 'products',
                ],
                [
                    'post_title' => $plan['name'],
                    'post_author' => $supplier->id,
                    'post_status' => 'publish',
                    'comment_status' => 'open',
                    'ping_status' => 'closed',
                    'post_value1' => 0.00, // Custo
                    'post_value2' => 0.00, // Preço de venda
                    'config' => $config,
                    'post_content' => $plan['description'],
                ]
            );
        }

        $this->command->info('Produtos IZA cadastrados com sucesso.');
    }
}
