<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\ApiCredential;
use App\Services\Qlib;

class ApiCredentialsAlloyalSeeder extends Seeder
{
    /**
     * Seed da credencial de integração Alloyal.
     * pt-BR: Cria/atualiza o registro integracao-alloyal com URL e metas de business_id.
     * en-US: Creates/updates integracao-alloyal record with URL and business_id metas.
     */
    public function run(): void
    {
        $slug = 'integracao-alloyal';
        $name = 'Integração Alloyal';
        $url = 'https://api.lecupon.com';
        $token = ''; // mantenha vazio por segurança; atualize via painel quando disponível
        $user = ''; // opcional; pode ser email do funcionário de cliente

        $config = json_encode([
            'url' => $url,
            'user' => $user,
            'pass' => $token, // sem criptografia aqui, vazio por segurança
        ]);

        $existing = ApiCredential::withoutGlobalScope('notDeleted')
            ->where('post_name', $slug)
            ->first();

        if ($existing) {
            $existing->update([
                'post_title' => $name,
                'post_status' => 'draft', // evita ativação sem token
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'comment_count' => 0,
                'excluido' => 'n',
                'deletado' => 'n',
                'config' => $config,
            ]);
            $postId = $existing->ID ?? $existing->id;
        } else {
            $created = ApiCredential::create([
                'post_title' => $name,
                'post_name' => Str::slug($slug),
                'post_status' => 'draft',
                'post_author' => '1',
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'comment_count' => 0,
                'excluido' => 'n',
                'deletado' => 'n',
                'token' => Qlib::token(),
                'config' => $config,
            ]);
            $postId = $created->ID ?? $created->id;
        }

        // Metacampos mais comuns para business_id
        Qlib::update_postmeta($postId, 'business_id', '2676');
        Qlib::update_postmeta($postId, 'business_id_alloyal', '2676');
        Qlib::update_postmeta($postId, 'bussness_id', '2676'); // compatibilidade com grafia anterior
    }
}

