<?php

namespace App\Http\Controllers;

use App\Services\Escola;
use App\Services\Qlib;
use Illuminate\Http\Request;
use App\Helpers\StringHelper;
use App\Http\Controllers\api\AlloyalController;
use Database\Seeders\MenuSeeder;
use App\Http\Controllers\api\SulAmericaController;

class TesteController extends Controller
{
    public function index(Request $request){
        $d = $request->all();

        // $helper = new StringHelper();
        // $ret = $helper->formatarCpf('12345678900');
        // $ret = $helper->formatarCpf('12345678900');
        // $ret = Escola::campo_emissiao_certificado();
        // $ret = Escola::dadosMatricula('6875579b0c808');
        // $ret = Qlib::dataLocal();
        // $ret = Qlib::add_user_tenant('demo2','cliente1.localhost');
        // $id_turma = $request->get('id_turma');
        // $ret = [];
        // if($id_turma){
        //     // $ret = Escola::adiciona_presenca_atividades_cronograma($id_turma);
        //     // dd($ret);
        // }
        // $ret = Qlib::qoption('url_api_aeroclube');
        // dd($ret);
        // $pid = $request->get('id');
        // if($pid){
        //     $ret = (new MenuController)->getMenus($pid);
        //     // dd($ret);
        //     return response()->json($ret);
        // }
        // $ret = (new MenuController)->getMenus(1);
        // $ret = Qlib::token();
         $type = $request->get('type');
        $ret = false;
        if($type=='contratacao'){
            $numero = $request->get('numero') ? $request->get('numero') : 6;
            $config = [
                'plano'=>1,
                'operacaoParceiro'=>Qlib::zerofill($numero,5),
                'nomeSegurado'=>'Programdor teste',
                'dataNascimento'=>'1989-06-05',
                'sexo'=>'F',
                'uf'=>'MG',
                'documento'=>'12345678909',
                'inicioVigencia'=>'2026-01-09',
                'fimVigencia'=>'2027-01-09',
            ];
            $ret = (new SulAmericaController)->contratacao($config);
        }elseif($type=='teste'){
            $id_pr = $request->get('id');
            $s = Qlib::getSupplier($id_pr);
            dd($s);
        }else{
            $ret = (new AlloyalController)->create_user_atived([
                'name' => 'Programador Teste',
                'email' => 'programador@teste.com',
                'cpf' => '49311114081',
                'password' => '123456',
            ]);
        }
        return $ret;
    }
}
