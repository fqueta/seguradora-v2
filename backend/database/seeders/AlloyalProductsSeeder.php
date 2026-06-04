<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Str;

class AlloyalProductsSeeder extends Seeder
{
    public function run(): void
    {
        $supplier = User::where('email', 'contato@alloyal.com.br')->first();
        if (!$supplier) {
            $this->command->error('Fornecedor Alloyal não encontrado!');
            return;
        }

        $productName = 'Alloyal - Clube de Benefícios';
        $slug = Str::slug($productName);

        $config = [
            'unit' => 'un',
            'image' => '',
            'availability' => 'available',
            'rating' => 0,
            'reviews' => 0,
            'terms' => [],
            'supplier_id' => $supplier->id,
            'tag' => 'Alloyal',
        ];

        Product::withoutGlobalScopes()->updateOrCreate(
            [
                'post_name' => $slug,
                'post_type' => 'products',
            ],
            [
                'post_title' => $productName,
                'post_author' => $supplier->id,
                'post_status' => 'publish',
                'comment_status' => 'open',
                'ping_status' => 'closed',
                'post_value1' => 0.00,
                'post_value2' => 0.00,
                'config' => $config,
                'post_content' => 'Clube de benefícios Alloyal.',
            ]
        );

        $this->command->info('Produto Alloyal cadastrado com sucesso.');
    }
}

