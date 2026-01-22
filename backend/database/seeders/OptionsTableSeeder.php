<?php

namespace Database\Seeders;

use App\Services\Qlib;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OptionsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //limpar primeiro as opções
        //limpar primeiro as opções
        DB::table('options')->truncate();

        $data = [
                [
                    'name'  => 'Id da permissão dos clientes',
                    'value' => '10',
                    'url'   => 'permission_client_id',
                ],
                [
                    'name'  => 'Id da permissão dos fornecedores',
                    'value' => '6',
                    'url'   => 'permission_supplier_id',
                ],
                [
                    'name'  => 'Cor primária do sistema',
                    'value' => '#0b217b',
                    'url'   => 'ui_primary_color',
                ],
                [
                    'name'  => 'Cor secundária do sistema',
                    'value' => '#4b89cd',
                    'url'   => 'ui_secondary_color',
                ],
                [
                    'name'  => 'Url importação Api Aeroclube',
                    'value' => 'https://api.aeroclubejf.com.br/api/v1/metricas',
                    'url'   => 'url_api_aeroclube',
                ],
                [
                    'name'  => 'Token da Api Aeroclube',
                    'value' => '',
                    'url'   => 'token_api_aeroclube',
                ],
                [
                    'name'  => 'Id do funil padrão de vendas',
                    'value' => '2',
                    'url'   => 'default_funil_vendas_id',
                ],
                [
                    'name'  => 'Id da etapa padrão de vendas',
                    'value' => '7',
                    'url'   => 'default_etapa_vendas_id',
                ],
                [
                    'name'  => 'Id da situação padrão das propostas',
                    'value' => '16',
                    'url'   => 'default_proposal_situacao_id',
                ],
                //url padrado do frontend
                [
                    'name'  => 'Url padrão do frontend',
                    'value' => 'https://eadcontrol.com.br',
                    'url'   => 'default_frontend_url',
                ],
                [
                    'name'  => 'Credenciais SulAmerica',
                    'value' => json_encode([
                        'url'=>'https://canalvenda-internet-develop.executivoslab.com.br/services/canalvenda?wsdl',
                        'user'=>'yello1232user',
                        'pass'=>'yello1232pass',
                        'produto'=>'10232',
                    ]),
                    'url'   => 'credenciais_sulamerica',
                    'tags'  => 'link',
                ],
            ];


        foreach ($data as $item) {
            DB::table('options')->updateOrInsert(
                ['url' => $item['url']],
                $item
            );
        }
    }
}
