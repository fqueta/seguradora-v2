<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Permission;

class MenuPermissionSeederEscritorio extends Seeder
{
    public function run(): void
    {
        $role = Permission::where('name', 'Escritório')->first();
        if (!$role) {
            $this->command->error('Permissão "Escritório" não encontrada. Execute PermissionSeeder primeiro.');
            return;
        }

        $data = [
            [
                'id' => 1,
                'title' => 'Dashboard',
                'parent_id' => null,
                'url' => '/',
                'icon' => 'Home',
                'can_view' => 1,
                'can_edit' => 1,
                'can_create' => 1,
                'can_delete' => 1,
                'can_upload' => 1,
                'menu_id' => 1,
            ],
            [
                'id' => 2,
                'title' => 'Clientes',
                'parent_id' => null,
                'url' => null,
                'icon' => 'Users',
                'can_view' => false,
                'items' => [
                    [
                        'id' => 3,
                        'title' => 'Lista de clientes',
                        'parent_id' => 2,
                        'url' => '/clients',
                        'icon' => null,
                        'can_view' => 1,
                        'can_edit' => 1,
                        'can_create' => 1,
                        'can_delete' => 1,
                        'can_upload' => 1,
                        'menu_id' => 3,
                    ],
                    [
                        'id' => 4,
                        'title' => 'Lista de contratos',
                        'parent_id' => 2,
                        'url' => '/contracts',
                        'icon' => null,
                        'can_view' => 1,
                        'can_edit' => 1,
                        'can_create' => 1,
                        'can_delete' => 1,
                        'can_upload' => 1,
                        'menu_id' => 4,
                    ],
                ],
            ],
            [
                'id' => 5,
                'title' => 'Produtos',
                'parent_id' => null,
                'url' => null,
                'icon' => null,
                'can_view' => false,
                'items' => [
                    [
                        'id' => 6,
                        'title' => 'Todos produtos',
                        'parent_id' => 5,
                        'url' => '/products',
                        'icon' => null,
                        'can_view' => 1,
                        'can_edit' => 1,
                        'can_create' => 1,
                        'can_delete' => 1,
                        'can_upload' => 1,
                        'menu_id' => 6,
                    ],
                ],
            ],
            [
                'id' => 7,
                'title' => 'Financeiro',
                'parent_id' => null,
                'url' => null,
                'icon' => null,
                'can_view' => false,
                'items' => [
                    [
                        'id' => 8,
                        'title' => 'Contas a pagar',
                        'parent_id' => 7,
                        'url' => '/finance/payables',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 8,
                    ],
                    [
                        'id' => 9,
                        'title' => 'Contas a receber',
                        'parent_id' => 7,
                        'url' => '/finance/receivables',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 9,
                    ],
                    [
                        'id' => 10,
                        'title' => 'Categorias',
                        'parent_id' => 7,
                        'url' => '/financial/categories',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 10,
                    ],
                ],
            ],
            [
                'id' => 11,
                'title' => 'Relatórios',
                'parent_id' => null,
                'url' => null,
                'icon' => 'LineChart',
                'can_view' => false,
                'items' => [
                    [
                        'id' => 12,
                        'title' => 'Geral',
                        'parent_id' => 11,
                        'url' => '/reports/relatorio-geral',
                        'icon' => null,
                        'can_view' => 1,
                        'can_edit' => 1,
                        'can_create' => 1,
                        'can_delete' => 1,
                        'can_upload' => 1,
                        'menu_id' => 12,
                    ],
                    [
                        'id' => 13,
                        'title' => 'Vendas',
                        'parent_id' => 11,
                        'url' => '/reports/relatorio-vendas',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 13,
                    ],
                ],
            ],
            [
                'id' => 14,
                'title' => 'Configurações',
                'parent_id' => null,
                'url' => null,
                'icon' => 'Cog',
                'can_view' => false,
                'items' => [
                    [
                        'id' => 15,
                        'title' => 'Usuários',
                        'parent_id' => 14,
                        'url' => '/settings/users',
                        'icon' => null,
                        'can_view' => 1,
                        'can_edit' => 1,
                        'can_create' => 1,
                        'can_delete' => 1,
                        'can_upload' => 1,
                        'menu_id' => 15,
                    ],
                    [
                        'id' => 16,
                        'title' => 'Fornecedores',
                        'parent_id' => 14,
                        'url' => '/suppliers',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 16,
                    ],
                    [
                        'id' => 17,
                        'title' => 'Dados da empresa',
                        'parent_id' => 14,
                        'url' => '/settings/dados_conta',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 17,
                    ],
                    [
                        'id' => 18,
                        'title' => 'Biblioteca de mídia',
                        'parent_id' => 14,
                        'url' => '/settings/media-library-demo',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 18,
                    ],
                    [
                        'id' => 19,
                        'title' => 'Permissões',
                        'parent_id' => 14,
                        'url' => '/settings/permissions',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 19,
                    ],
                    [
                        'id' => 20,
                        'title' => 'Funil e etapas',
                        'parent_id' => 14,
                        'url' => '/settings/stages',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 20,
                    ],
                    [
                        'id' => 21,
                        'title' => 'Todas Categorias',
                        'parent_id' => 14,
                        'url' => '/categories',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 21,
                    ],
                    [
                        'id' => 22,
                        'title' => 'Organizações',
                        'parent_id' => 14,
                        'url' => '/settings/organizations',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 22,
                    ],
                    [
                        'id' => 23,
                        'title' => 'Sistema',
                        'parent_id' => 14,
                        'url' => '/settings/system',
                        'icon' => null,
                        'can_view' => 0,
                        'can_edit' => 0,
                        'can_create' => 0,
                        'can_delete' => 0,
                        'can_upload' => 0,
                        'menu_id' => 23,
                    ],
                ],
            ],
        ];

        $flatten = function (array $node) use (&$flatten) {
            $items = [];
            $items[] = $node;
            if (isset($node['items']) && is_array($node['items'])) {
                foreach ($node['items'] as $child) {
                    $items = array_merge($items, $flatten($child));
                }
            }
            return $items;
        };

        $all = [];
        foreach ($data as $entry) {
            $all = array_merge($all, $flatten($entry));
        }

        foreach ($all as $item) {
            $menuId = $item['menu_id'] ?? $item['id'];
            DB::table('menu_permission')->updateOrInsert(
                [
                    'menu_id' => $menuId,
                    'permission_id' => $role->id,
                ],
                [
                    'can_view' => (bool)$item['can_view'],
                    'can_create' => (bool)($item['can_create'] ?? false),
                    'can_edit' => (bool)($item['can_edit'] ?? false),
                    'can_delete' => (bool)($item['can_delete'] ?? false),
                    'can_upload' => (bool)($item['can_upload'] ?? false),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }

        $this->command->info('MenuPermissionSeederEscritorio aplicado para o grupo Escritório.');
    }
}
