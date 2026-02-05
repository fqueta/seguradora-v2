<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class LsxProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Buscar o usuário LSX Medical
        $supplier = \App\Models\User::where('name', 'like', 'LSX MEDICAL%')->first();
        
        if (!$supplier) {
            $this->command->error('Fornecedor LSX Medical não encontrado!');
            return;
        }

        $products = [
            [
                'ID' => 20,
                'post_title' => 'Produto LSX Medical',
                'post_name' => 'produto-lsx-medical',
                'post_value1' => 10.00, // Preço de custo
                'post_value2' => 25.00, // Preço de venda
                'config' => ['plan' => '1','unit'=>'un','image'=>'','availability'=>'available','rating'=>0,'reviews'=>0,'terms'=>[],'supplier_id'=>$supplier->id],
            ],
        ];

        foreach ($products as $product) {
            // Adicionar supplier_id ao config
            $config = $product['config'];
            $config['supplier_id'] = $supplier->id;

            Product::withoutGlobalScopes()->updateOrCreate(
                ['ID' => $product['ID']],
                [
                    'post_title' => $product['post_title'],
                    'post_name' => $product['post_name'],
                    'post_author' => $supplier->id, // Usar ID real do fornecedor
                    'post_value1' => $product['post_value1'],
                    'post_value2' => $product['post_value2'],
                    'post_type' => 'products',
                    'post_status' => 'publish',
                    'comment_status' => 'open',
                    'ping_status' => 'closed',
                    'config' => $config,
                ]
            );
        }
    }
}
