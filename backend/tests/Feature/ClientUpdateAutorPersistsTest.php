<?php

use App\Models\User;
use App\Models\Client;
use App\Models\Menu;
use App\Models\MenuPermission;
use App\Models\Permission;

test('alterar consultor (autor) persiste na atualização do cliente', function () {
    // Usuário autenticado com permissão ativa e grupo configurado
    // Criar perfil/permissão e associar ao usuário
    $perfil = Permission::create([
        'name' => 'Perfil Teste',
        'guard_name' => 'web',
        'active' => 's',
    ]);
    $user = User::factory()->create([
        'status' => 'actived',
        'ativo' => 's',
        'permission_id' => $perfil->id,
        'name' => 'Operador',
        'email' => 'operador.' . \Illuminate\Support\Str::random(6) . '@example.com',
    ]);

    // Configurar menu e permissão para rota /clients com can_edit
    $menu = Menu::create([
        'title' => 'Clientes',
        'url' => '/clients',
    ]);
    MenuPermission::create([
        'menu_id' => $menu->id,
        'permission_id' => $perfil->id,
        'can_view' => 1,
        'can_create' => 1,
        'can_edit' => 1,
        'can_delete' => 1,
        'can_upload' => 1,
    ]);

    // Cliente existente com autor inicial (o próprio usuário autenticado)
    $client = Client::create([
        'tipo_pessoa' => 'pf',
        'name' => 'Cliente Teste',
        'status' => 'actived',
        'ativo' => 's',
        'permission_id' => 10,
        'client_permission' => [10],
        'organization_id' => 1,
        'autor' => $user->id,
    ]);

    // Novo consultor para ser atribuído
    $novoConsultor = User::factory()->create([
        'status' => 'actived',
        'ativo' => 's',
        'name' => 'Consultor Novo',
        'email' => 'consultor.' . \Illuminate\Support\Str::random(6) . '@example.com',
    ]);

    // Autenticar e realizar a atualização via API
    $this->actingAs($user);
    $response = $this->putJson('/api/v1/clients/' . $client->id, [
        'autor' => $novoConsultor->id,
    ]);

    $response->assertStatus(200);
    $response->assertJsonPath('data.autor', $novoConsultor->id);

    // Confirmar persistência no banco
    $client->refresh();
    expect($client->autor)->toBe($novoConsultor->id);
});
