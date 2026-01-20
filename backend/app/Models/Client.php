<?php

namespace App\Models;

use App\Http\Controllers\api\ClientController;
use Illuminate\Database\Eloquent\Builder;
use App\Models\User;
use App\Models\Permission;
use App\Services\Qlib;

class Client extends User
{
    protected $table = 'users';

    /**
     * Escopos e eventos do modelo Client.
     *
     * PT: Define dinamicamente o `permission_id` do perfil "Cliente" ao criar
     * e aplica escopo global para retornar somente clientes desse perfil.
     * O ID é obtido da tabela `permissions` pelo nome "Cliente";
     * caso não exista, usa 7 como fallback.
     * EN: Dynamically sets the "Cliente" role `permission_id` on create
     * and applies a global scope to only return clients of that role.
     * The ID is resolved from `permissions` by name "Cliente"; falls back to 10.
     * O sistema deve considerar cliente os usuarios com permission_id= 10 ou que client_permission contenha 10
     */
    protected static function booted()
    {
        // Resolve o ID do perfil "Cliente" dinamicamente
        $optionId = Qlib::qoption('permission_client_id');
        $permId = null;
        try {
            $permId = Permission::whereIn('name', ['Cliente', 'Clientes'])->value('id');
        } catch (\Throwable $e) {
            $permId = null;
        }
        $cliente_permission_id = $permId ?: ($optionId ?: 10);
        static::creating(function ($client) use ($cliente_permission_id) {
            $client->permission_id = $cliente_permission_id;
            $existing = $client->client_permission ?? [];
            if (is_string($existing)) {
                $decoded = json_decode($existing, true);
                $existing = is_array($decoded) ? $decoded : [];
            }
            if (!in_array($cliente_permission_id, $existing, true)) {
                $existing[] = $cliente_permission_id;
            }
            $client->client_permission = $existing;
        });

        static::addGlobalScope('client', function (Builder $builder) use ($cliente_permission_id) {
            $builder->where(function ($q) use ($cliente_permission_id) {
                $q->where('permission_id', $cliente_permission_id)
                  ->orWhereJsonContains('client_permission', $cliente_permission_id)
                  ->orWhereJsonContains('client_permission', (string)$cliente_permission_id);
            });
        });
    }

    protected $fillable = [
        'tipo_pessoa',
        'name',
        'razao',
        'cpf',
        'cnpj',
        'email',
        'password',
        'status',
        'genero',
        'verificado',
        'permission_id',
        'client_permission',
        'config',
        'preferencias',
        'foto_perfil',
        'ativo',
        'autor',
        'token',
        'excluido',
        'reg_excluido',
        'deletado',
        'reg_deletado',
        'organization_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'config' => 'array',
        'client_permission' => 'array',
    ];
}
