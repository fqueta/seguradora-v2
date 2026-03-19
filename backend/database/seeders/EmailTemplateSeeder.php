<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmailTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $postType = 'email_template';

        $items = [
            [
                'post_name' => 'contract_approved',
                'post_title' => 'Seu contrato de seguro foi aprovado! 🎉',
                'post_content' => '<p>Olá <strong>[client_name]</strong>,</p>
<p>Boas notícias! Seu contrato para o produto <strong>[product_name]</strong> foi aprovado com sucesso.</p>
<p><strong>Detalhes do Contrato:</strong></p>
<ul>
<li><strong>Número:</strong> [contract_number]</li>
<li><strong>Vigência:</strong> [start_date] até [end_date]</li>
<li><strong>Periodicidade:</strong> [periodicity]</li>
</ul>
<p>Estamos muito felizes em ter você conosco. Caso tenha qualquer dúvida, nossa equipe está à disposição.</p>
<p>Atenciosamente,<br>Equipe Yellow</p>',
                'post_status' => 'publish',
            ],
        ];

        foreach ($items as $item) {
            DB::table('posts')->updateOrInsert(
                [
                    'post_name' => $item['post_name'],
                    'post_type' => $postType,
                ],
                [
                    'post_title' => $item['post_title'],
                    'post_content' => $item['post_content'],
                    'post_status' => $item['post_status'],
                    'comment_status' => 'closed',
                    'ping_status' => 'closed',
                    'post_author' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
