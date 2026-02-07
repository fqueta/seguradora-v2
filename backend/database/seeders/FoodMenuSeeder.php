<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Product;

class FoodMenuSeeder extends Seeder
{
    public function run(): void
    {
        // Obtém todas as categorias de PRODUTOS criadas pelo CategorySeeder
        $categorias = Category::where('entidade', 'produtos')->get();
        if ($categorias->isEmpty()) {
            // Fallback defensivo: cria as categorias básicas caso não existam
            $categorias = collect([
                Category::firstOrCreate(
                    ['name' => 'Hambúrgueres', 'entidade' => 'produtos'],
                    ['description' => 'Lanches artesanais', 'active' => true]
                ),
                Category::firstOrCreate(
                    ['name' => 'Pizzas', 'entidade' => 'produtos'],
                    ['description' => 'Pizzas diversas', 'active' => true]
                ),
                Category::firstOrCreate(
                    ['name' => 'Bebidas', 'entidade' => 'produtos'],
                    ['description' => 'Bebidas geladas', 'active' => true]
                ),
            ]);
        }

        // Define catálogos por nome (se existir); desconhecidas recebem itens genéricos
        $catalogosPorNome = [
            'Hambúrgueres' => [
                ['name' => 'Cheeseburger', 'desc' => 'Hambúrguer com queijo, alface, tomate e molho especial.', 'sale' => 24.90, 'cost' => 12.00, 'stock' => 100, 'unit' => 'un'],
                ['name' => 'X-Bacon', 'desc' => 'Hambúrguer com bacon crocante e queijo.', 'sale' => 29.90, 'cost' => 15.00, 'stock' => 80, 'unit' => 'un'],
            ],
            'Pizzas' => [
                ['name' => 'Pizza Mussarela', 'desc' => 'Pizza clássica de mussarela (8 fatias).', 'sale' => 49.90, 'cost' => 25.00, 'stock' => 50, 'unit' => 'un'],
                ['name' => 'Pizza Calabresa', 'desc' => 'Pizza de calabresa com cebola (8 fatias).', 'sale' => 54.90, 'cost' => 28.00, 'stock' => 50, 'unit' => 'un'],
            ],
            'Bebidas' => [
                ['name' => 'Refrigerante Lata', 'desc' => '350ml, sabores variados.', 'sale' => 6.00, 'cost' => 3.00, 'stock' => 200, 'unit' => 'un'],
                ['name' => 'Água Mineral', 'desc' => '500ml sem gás.', 'sale' => 4.00, 'cost' => 1.50, 'stock' => 200, 'unit' => 'un'],
            ],
        ];

        foreach ($categorias as $cat) {
            $lista = $catalogosPorNome[$cat->name] ?? [
                ['name' => "{$cat->name} Item 1", 'desc' => "Item padrão da categoria {$cat->name}", 'sale' => 19.90, 'cost' => 9.90, 'stock' => 50, 'unit' => 'un'],
                ['name' => "{$cat->name} Item 2", 'desc' => "Item padrão da categoria {$cat->name}", 'sale' => 24.90, 'cost' => 12.90, 'stock' => 50, 'unit' => 'un'],
            ];

            foreach ($lista as $p) {
                // Evita duplicação por nome
                $exists = Product::withoutGlobalScopes()
                    ->where('post_title', $p['name'])
                    ->where(function($q){
                        $q->whereNull('excluido')->orWhere('excluido','!=','s');
                    })
                    ->where(function($q){
                        $q->whereNull('deletado')->orWhere('deletado','!=','s');
                    })
                    ->first();
                if ($exists) {
                    continue;
                }
                $prod = new Product();
                $prod->name = $p['name'];
                $prod->description = $p['desc'];
                $prod->category_id = $cat->id; // mutator -> guid
                $prod->salePrice = $p['sale'];
                $prod->costPrice = $p['cost'];
                $prod->stock = $p['stock'];
                $prod->config = ['unit' => $p['unit']];
                $prod->active = true;
                $prod->save();
            }
        }
    }
}
