<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class SulamericaProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Buscar o usuário SulAmérica
        $supplier = \App\Models\User::where('name', 'like', 'Sul América%')->first();
        
        if (!$supplier) {
            $this->command->error('Fornecedor Sul América não encontrado!');
            return;
        }

        $products = [
            
            [
                'ID' => 3,
                'post_title' => 'MA 5K + IPA 5K + TEL + FUN',
                'post_name' => 'ma-5k-ipa-5k-tel-fun',
                'post_value1' => 2.68, // Preço de custo
                'post_value2' => 19.99, // Preço de custo
                'config' => ['plan' => '1','unit'=>'un','image'=>'','availability'=>'available','rating'=>0,'reviews'=>0,'terms'=>[],'supplier_id'=>$supplier->id],
            ],
            [
                'ID' => 4,
                'post_title' => 'MA 5K + IPA 5K + TEL',
                'post_name' => 'ma-5k-ipa-5k-tel',
                'post_value1' => 1.61,
                'post_value2' => 14.99,
                'config' => ['plan' => '2','unit'=>'un','image'=>'','availability'=>'available','rating'=>0,'reviews'=>0,'terms'=>[],'supplier_id'=>$supplier->id],
            ],
            [
                'ID' => 5,
                'post_title' => 'MA 5K + TEL',
                'post_name' => 'ma-5k-tel',
                'post_value1' => 2.28,
                'post_value2' => 12.99,
                'config' => ['plan' => '3','unit'=>'un','image'=>'','availability'=>'available','rating'=>0,'reviews'=>0,'terms'=>[],'supplier_id'=>$supplier->id],
            ],
            [
                'ID' => 6,
                'post_title' => 'MA 10K + TEL',
                'post_name' => 'ma-10k-tel',
                'post_value1' => 2.41,
                'post_value2' => 19.99,
                'config' => ['plan' => '4','unit'=>'un','image'=>'','availability'=>'available','rating'=>0,'reviews'=>0,'terms'=>[],'supplier_id'=>$supplier->id],
            ],
            [
                'ID' => 7,
                'post_title' => 'MA 5K + FUN',
                'post_name' => 'ma-5k-fun',
                'post_value1' => 2.21,
                'post_value2' => 12.99,
                'config' => ['plan' => '5','unit'=>'un','image'=>'','availability'=>'available','rating'=>0,'reviews'=>0,'terms'=>[],'supplier_id'=>$supplier->id],
            ],
            [
                'ID' => 8,
                'post_title' => 'MA 10K + FUN',
                'post_name' => 'ma-10k-fun',
                'post_value1' => 3.73,
                'post_value2' => 29.99,
                'config' => ['plan' => '6','unit'=>'un','image'=>'','availability'=>'available','rating'=>0,'reviews'=>0,'terms'=>[],'supplier_id'=>$supplier->id],
            ],
            [
                'ID' => 9,
                'post_title' => 'MA 5K - ASS.RES.',
                'post_name' => 'ma-5k-ass-res',
                'post_value1' => 0.77,
                'post_value2' => 12.99,
                'config' => ['plan' => '7','unit'=>'un','image'=>'','availability'=>'available','rating'=>0,'reviews'=>0,'terms'=>[],'supplier_id'=>$supplier->id],
            ],
            [
                'ID' => 10,
                'post_title' => 'MA 5K + IPA 5K',
                'post_name' => 'ma-5k-ipa-5k',
                'post_value1' => 0.25,
                'post_value2' => 12.99,
                'config' => ['plan' => '8','unit'=>'un','image'=>'','availability'=>'available','rating'=>0,'reviews'=>0,'terms'=>[],'supplier_id'=>$supplier->id],
            ],
            [
                'ID' => 11,
                'post_title' => 'MA 5K + IPA 5K + FUN',
                'post_name' => 'ma-5k-ipa-5k-fun',
                'post_value1' => 2.33,
                'post_value2' => 12.99,
                'config' => ['plan' => '9','unit'=>'un','image'=>'','availability'=>'available','rating'=>0,'reviews'=>0,'terms'=>[],'supplier_id'=>$supplier->id],
            ],
            [
                'ID' => 12,
                'post_title' => 'PLANO PARA TESTE API',
                'post_name' => 'plano-para-teste-api',
                'post_value1' => 3.96, // Preço de custo
                'post_value2' => 12.99,
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
