<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\Log;

class EmailTemplateService
{
    /**
     * Busca um template de e-mail pelo slug (post_name) e opcionalmente por organização
     *
     * @param string $slug
     * @param int|string|null $organizationId
     * @return Post|null
     */
    public function getTemplate(string $slug, $organizationId = null): ?Post
    {
        // 1. Tenta buscar o template específico da organização (incluindo rascunhos para verificar existência)
        if ($organizationId) {
            $orgTemplate = Post::where('post_type', 'email_template')
                ->where('post_name', $slug)
                ->where('organization_id', $organizationId)
                ->where('excluido', 'n')
                ->first();

            if ($orgTemplate) {
                // Se existe template para a org e está publicado, retorna ele.
                // Se existe mas não está publicado (rascunho), retorna null (bloqueia o envio).
                return $orgTemplate->post_status === 'publish' ? $orgTemplate : null;
            }
        }

        // 2. Se não achou nada para a organização (ou organizationId é null), busca o global
        return Post::where('post_type', 'email_template')
            ->where('post_name', $slug)
            ->where(function ($q) {
                $q->whereNull('organization_id')->orWhere('organization_id', '');
            })
            ->published()
            ->orderBy('ID', 'desc')
            ->where('excluido', 'n')
            ->first();
    }

    /**
     * Processa o conteúdo do template substituindo os shortcodes pelos valores reais
     *
     * @param string $content
     * @param array $data
     * @return string
     */
    public function parse(string $content, array $data): string
    {
        foreach ($data as $key => $value) {
            $shortcode = '[' . $key . ']';
            $content = str_replace($shortcode, (string)$value, $content);
        }

        return $content;
    }

    /**
     * Retorna a lista de shortcodes disponíveis para um determinado contexto (ex: contrato)
     * Isso será útil no frontend.
     *
     * @param string $context
     * @return array
     */
    public function getAvailableShortcodes(string $context = 'contract'): array
    {
        $shortcodes = [
            'contract' => [
                'user_name' => 'Nome do Cliente',
                'user_email' => 'E-mail do Cliente',
                'contract_number' => 'Número do Contrato',
                'product_name' => 'Nome do Produto',
                'start_date' => 'Data de Início',
                'end_date' => 'Data de Término/Vigência',
                'value' => 'Valor do Contrato',
            ],
            'general' => [
                'company_name' => 'Nome da Empresa/Organização',
                'current_date' => 'Data Atual',
            ]
        ];

        return $shortcodes[$context] ?? $shortcodes['general'];
    }
}
