<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;

class LsxProductsSeeder extends Seeder
{
    /**
     * Executa a seed de produtos LSX.
     * pt-BR: Cria/atualiza o produto "Telemedicina" com supplier LSX MEDICAL.
     * en-US: Creates/updates "Telemedicine" product with LSX MEDICAL supplier.
     */
    public function run(): void
    {
        $supplier = \App\Models\User::where('name', 'like', 'LSX MEDICAL%')->first();
        if (!$supplier) {
            $this->command->error('Fornecedor LSX MEDICAL não encontrado!');
            return;
        }

        $product = [
            'post_title' => 'Telemedicina',
            'post_name' => 'telemedicina',
            'post_value1' => 5.00,   // custo (assumido)
            'post_value2' => 19.90,  // preço de venda (assumido)
            'config' => [
                'unit' => 'un',
                'image' => '',
                'availability' => 'available',
                'rating' => 0,
                'reviews' => 0,
                'terms' => [],
                'supplier_id' => $supplier->id,
                'tag' => 'LSX',
            ],
        ];

        Product::withoutGlobalScopes()->updateOrCreate(
            [
                'post_name' => $product['post_name'],
                'post_type' => 'products',
            ],
            [
                'post_title' => $product['post_title'],
                'post_author' => $supplier->id,
                'post_value1' => $product['post_value1'],
                'post_value2' => $product['post_value2'],
                'post_status' => 'publish',
                'comment_status' => 'open',
                'ping_status' => 'closed',
                'config' => $product['config'],
            ]
        );
    }
}

