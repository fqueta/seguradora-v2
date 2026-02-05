<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\Permission;
use App\Services\Qlib;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MenuSeeder extends Seeder
{
    /**
     * Seed principal:
     * - Cria menus a partir do JSON (CRM ou Oficina).
     * - Garante grupos de permissões iniciais.
     * - Vincula todos os menus aos grupos em `menu_permission`.
     */
    public function run(): void
    {
        /**
         * Desabilita FKs temporariamente para permitir truncates em ordem segura.
         */
        try { DB::statement('SET FOREIGN_KEY_CHECKS=0'); } catch (\Throwable $e) {}

        // Limpa vínculos dependentes e tabela de menus para evitar duplicações
        DB::table('menu_permission')->truncate();
        DB::table('menus')->truncate();

        // Carrega JSON externo conforme modo do sistema
        if (Qlib::is_crm_aero()) {
            $path = database_path('seeders/data/menu_crm.json');
        } else {
            $path = database_path('seeders/data/menu.json');
        }
        $json = is_file($path) ? file_get_contents($path) : null;
        $menus = $json ? json_decode($json, true) : [];
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($menus)) {
            throw new \RuntimeException(sprintf(
                'Falha ao carregar JSON de menus (%s): %s',
                $path,
                json_last_error_msg()
            ));
        }

        // Cria toda a hierarquia de menus
        $this->createMenus($menus);

        /**
         * Permissões iniciais (Master = 1) e vínculos menu_permission.
         */
        DB::table('permissions')->truncate();
        // Permissions data
        $permissionsData = [
            // MASTER → acesso a tudo
            [
                'id' => 1,
                'name' => 'Master',
                'description' => 'Desenvolvedores',
                'redirect_login' => '/home',
                'active' => 's',
            ],

            // ADMINISTRADOR → tudo, mas em configurações só "Usuários" e "Perfis"
            [
                'id' => 2,
                'name' => 'Administrador',
                'description' => 'Administradores do sistema',
                'redirect_login' => '/home',
                'active' => 's'
            ],

            // GERENTE → todos os menus exceto configurações
            [
                'id' => 3,
                'name' => 'Diretor',
                'description' => 'Gerente do sistema (sem acesso a configurações)',
                'redirect_login' => '/home',
                'active' => 's',
            ],

            // ESCRITÓRIO → somente dois primeiros menus
            [
                'id' => 4,
                'name' => 'Escritório',
                'description' => 'Acesso limitado a Dashboard e Clientes',
                'redirect_login' => '/home',
                'active' => 's'
            ],
            // CONSULTOR → somente dois primeiros menus
            [
                'id' => 5,
                'name' => 'Vendedor',
                'description' => 'Vendedores do sistema',
                'redirect_login' => '/home',
                'active' => 's'
            ],
            // FORNECEDOR → somente dois primeiros menus
            [
                'id' => 6,
                'name' => 'Fornecedor',
                'description' => 'Fornecedores do sistema',
                'redirect_login' => '/home',
                'active' => 's'
            ],
            // Cliente → para clientes sem acesso ao admin
            [
                'id' => 10,
                'name' => 'Cliente',
                'description' => 'Clientes do sistema sem acesso ao painel de administração',
                'redirect_login' => '/home',
                'active' => 's'
            ],
        ];

        // Prepare and filter data
        $permissionsToInsert = [];
        $tableName = 'permissions';

        foreach ($permissionsData as $p) {
            // Add potential missing fields
            $p['excluido'] = 'n';
            $p['deletado'] = 'n';
            $p['guard_name'] = 'web';
            $p['created_at'] = now();
            $p['updated_at'] = now();

            // Filter
            $validP = array_filter($p, function ($key) use ($tableName) {
                return \Illuminate\Support\Facades\Schema::hasColumn($tableName, $key);
            }, ARRAY_FILTER_USE_KEY);

            $permissionsToInsert[] = $validP;
        }

        DB::table('permissions')->insert($permissionsToInsert);

        // Recria vínculos de permissão para todos os menus
        $menusCollection = Menu::all();
        $groupsCollection = Permission::all();
        foreach ($menusCollection as $menu) {
            foreach ($groupsCollection as $group) {
                DB::table('menu_permission')->insert([
                    'menu_id'       => $menu->id,
                    'permission_id' => $group->id,
                    'can_view'      => $group->id == 1,
                    'can_create'    => $group->id == 1,
                    'can_edit'      => $group->id == 1,
                    'can_delete'    => $group->id == 1,
                    'can_upload'    => $group->id == 1,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }
        }

        // Restaura verificação de FKs
        try { DB::statement('SET FOREIGN_KEY_CHECKS=1'); } catch (\Throwable $e) {}

        /**
         * Executa as seeders de permissões específicas de cada perfil.
         * Isso garante que, ao rodar MenuSeeder, todas as regras
         * de menu_permission por perfil sejam aplicadas automaticamente.
         */
        $this->call(MenuPermissionSeedersAll::class);
    }

    /**
     * Cria hierarquia de menus a partir do JSON.
     */
    private function createMenus(array $menus, ?int $parentId = null): void
    {
        foreach ($menus as $index => $menu) {
            $id = DB::table('menus')->insertGetId([
                'title'      => $menu['title'],
                'url'        => $menu['url'] ?? null,
                'icon'       => $menu['icon'] ?? null,
                'items'      => isset($menu['submenu']) ? json_encode($menu['submenu'], JSON_UNESCAPED_UNICODE) : null,
                'active'     => 'y',
                'order'      => $index,
                'parent_id'  => $parentId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (!empty($menu['submenu'])) {
                $this->createMenus($menu['submenu'], $id);
            }
        }
    }
}
