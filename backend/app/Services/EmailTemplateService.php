<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\Log;

class EmailTemplateService
{
    /**
     * Busca um template de e-mail pelo slug (post_name)
     *
     * @param string $slug
     * @return Post|null
     */
    public function getTemplate(string $slug): ?Post
    {
        return Post::where('post_type', 'email_template')
            ->where('post_name', $slug)
            ->where('post_status', 'publish')
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
