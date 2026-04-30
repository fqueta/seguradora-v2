<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ApiCredential;
use App\Models\User;
use App\Services\Qlib;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class IzaIntegrationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $name = 'Integração IZA';
        $slug = 'integracao-iza';
        $url = 'https://intermittent-web-api.hml.iza.com.vc';
        $token = '';

        // Tenta encontrar um autor válido (primeiro admin ou ID 1)
        $author = User::where('permission_id', 1)->first() ?? User::find(1);
        $authorId = $author ? $author->id : 1;

        $config = [
            'url' => $url,
            'pass' => Crypt::encryptString($token),
        ];

        ApiCredential::updateOrCreate(
            ['post_name' => $slug],
            [
                'post_title' => $name,
                'post_status' => 'publish',
                'post_author' => $authorId,
                'comment_status' => 'closed',
                'ping_status' => 'closed',
                'menu_order' => 0,
                'comment_count' => 0,
                'excluido' => 'n',
                'deletado' => 'n',
                'token' => Qlib::token(),
                'config' => $config, // O modelo faz o cast para array/json
            ]
        );

        $this->command->info('Configuração da Integração IZA inserida com sucesso.');
    }
}
