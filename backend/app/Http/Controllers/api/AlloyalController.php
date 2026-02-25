<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\api\PointController;
use App\Http\Controllers\api\ApiCredentialController;
use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Organization;
use App\Models\User;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class AlloyalController extends Controller
{
    protected $url_api_aloyall;
    protected $clientEmployeeEmail;
    protected $clientEmployeeToken;
    protected $business_id_alloyal;
    protected $endpoint;
    protected $deposit_active = false;
    protected $redirect_url_login = '';
    protected $integration_active = false;
    public function __construct()
    {
        // Defaults (fallback)
        // $this->url_api_aloyall = Qlib::qoption('url_api_aloyall') ?? 'https://api.lecupon.com';
        // $this->clientEmployeeEmail = Qlib::qoption('email_admin_api_alloyal') ?? '';
        // $this->clientEmployeeToken = Qlib::qoption('token_api_alloyal') ?? '';
        // $this->business_id_alloyal = Qlib::qoption('business_id_alloyal') ?? '2676';
        // $this->deposit_active = Qlib::qoption('deposit_active_alloyal') ?? false;
        // $this->redirect_url_login = Qlib::qoption('redirect_url_login_alloyal') ?? '';
        // Load credentials from ApiCredential by slug
        $this->loadCredentialsFromApi('integracao-alloyal');
        // Build base endpoint
        $this->endpoint = '/client/v2/businesses/' . $this->business_id_alloyal;
    }
    /**
     * Carrega credenciais da ApiCredential pelo post_name (slug) e
     * aplica nas propriedades do controlador (URL, email, token e business_id).
     *
     * @param string $slug
     * @return void
     */
    private function loadCredentialsFromApi(string $slug): void
    {
        try {
            $collector = new ApiCredentialController();
            $cred = $collector->get($slug);
            if (is_array($cred) && !empty($cred)) {
                $this->integration_active = (bool)($cred['active'] ?? false);
                $cfg = isset($cred['config']) && is_array($cred['config']) ? $cred['config'] : [];
                // URL, usuário/email e token/senha
                $this->url_api_aloyall = $cfg['url'] ?? $this->url_api_aloyall;
                $this->clientEmployeeEmail = $cfg['user'] ?? $this->clientEmployeeEmail;
                $this->clientEmployeeToken = $cfg['pass'] ?? $this->clientEmployeeToken;
                // Buscar business_id nos metacampos com chaves comuns
                $meta = isset($cred['meta']) && is_array($cred['meta']) ? $cred['meta'] : [];
                //buscar os dados da organização do usuario logado
                $organization_id = Auth::user()->organization_id ?? null;
                if ($organization_id) {
                    $organization_data = Organization::find($organization_id);
                    if (isset($organization_data->config['alloyal_business_id'])) {
                        $this->business_id_alloyal = (string)$organization_data->config['alloyal_business_id'];
                    }else{
                        $businessId = $this->findMetaValue($meta, ['bussness_id', 'business_id']);
                        if ($businessId) {
                            $this->business_id_alloyal = (string)$businessId;
                        }
                    }
                }else{
                    $businessId = $this->findMetaValue($meta, ['bussness_id', 'business_id']);
                    if ($businessId) {
                        $this->business_id_alloyal = (string)$businessId;
                    }
                }
            }
            $this->applyOrganizationSettings();
        } catch (\Throwable $e) {
            // Silencioso: mantém valores padrão
        }
    }

    /**
     * Aplica configurações específicas da organização do usuário autenticado.
     * Prioriza o business_id definido na organização.
     *
     * @return void
     */
    private function applyOrganizationSettings(): void
    {
        if (auth()->check()) {
            $user = auth()->user();
            if ($user && $user->organization_id) {
                $org = $user->organization ?? \App\Models\Organization::find($user->organization_id);
                if ($org) {
                    // Tenta do config (novo local) ou do campo direto (fallback/antigo)
                    $businessId = $org->config['alloyal_business_id'] ?? $org->alloyal_business_id;
                    if ($businessId) {
                        $this->business_id_alloyal = (string)$businessId;
                        $this->endpoint = '/client/v2/businesses/' . $this->business_id_alloyal;
                    }
                }
            }
        }
    }
    /**
     * Busca o valor de metacampo por uma lista de possíveis chaves.
     *
     * @param array $meta Ex.: [['key'=>'bussness_id','value'=>'2676'], ...]
     * @param array $possibleKeys Ex.: ['bussness_id','business_id']
     * @return string|null
     */
    private function findMetaValue(array $meta, array $possibleKeys): ?string
    {
        $targets = array_map(function ($k) { return strtolower(trim((string)$k)); }, $possibleKeys);
        foreach ($meta as $m) {
            $k = strtolower(trim((string)($m['key'] ?? '')));
            if (in_array($k, $targets, true)) {
                $v = (string)($m['value'] ?? '');
                if ($v !== '') {
                    return $v;
                }
            }
        }
        return null;
    }
    private function isIntegrationActive(): bool
    {
        return (bool)$this->integration_active;
    }
    /**
     * Retorna as credenciais resolvidas da integração Alloyal.
     * pt-BR: Exibe os valores efetivos carregados do registro "integracao-alloyal".
     * en-US: Shows the effective values loaded from the "integracao-alloyal" record.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function credentialsResolved()
    {
        $data = [
            'active' => $this->isIntegrationActive(),
            'url' => $this->url_api_aloyall,
            'user' => $this->clientEmployeeEmail,
            'token' => $this->clientEmployeeToken,
            'business_id' => $this->business_id_alloyal,
            'endpoint' => $this->endpoint,
            'deposit_active' => (bool)$this->deposit_active,
        ];
        return response()->json(['exec' => true, 'data' => $data], 200);
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * deposita na conta do clientes.
     */
    public function deposit($data,$idendificador='')
    {
        if(!$this->isIntegrationActive()){
            return ['exec'=>false,'message'=>'Integração Alloyal inativa'];
        }
        if(!isset($data['document']) || !isset($data['amount'])){
            return ['exec'=>false,'message'=>'Dados incompletos'];
        }
        if(!isset($data['description'])){
            $data['description'] = 'Depósito via API';
        }
        $token = uniqid();
        $headers = [
            'X-ClientEmployee-Token' => $this->clientEmployeeToken,
            'X-ClientEmployee-Email' => $this->clientEmployeeEmail,
            'Idempotency-Key' => $token,//Qlib::zerofill($idendificador,6),
            'Content-Type' => 'application/json'
        ];
        $client_id = Client::where('cpf',$data['document'])->value('id');
        if(!$client_id){
            return ['exec'=>false,'message'=>'Cliente não encontrado'];
        }
        $save_ident = Qlib::update_usermeta($client_id,'token_alloyal',$token);
        $body = [
            "document" => $data['document'],
            "amount" => $data['amount'],
            "wallet_type" => $data['wallet_type'] ?? 'external',
            "currency" => $data['currency'] ?? 'BRL',
            "description" => $data['description'],
        ];
        $ret['exec'] = false;
        $ret['message'] = 'Erro ao depositar na conta do cliente';
        try {
            $endpoint = $this->endpoint . '/deposits';
            $url = $this->url_api_aloyall . $endpoint;
            $response = Http::withHeaders($headers)->post($url, $body);
            // dd($url,$headers,$response->json(),$body);
            $ret['exec'] = true;
            $ret['data'] = $response->json();
            if(isset($ret['data']['error'])){
                $ret['message'] = $ret['data']['error'];
                $ret['data'] = $data;
                $ret['exec'] = false;
                return $ret;
            }else{
                //lançar baixa do credito
                $baixar = (new PointController)->createOrUpdate([
                    'client_id' => $client_id,
                    'tipo' => 'debito',
                    'valor' => (int)$data['amount']*(-1),
                    'description' => $data['description'],
                ]);
                $ret['baixar'] = $baixar;
                $ret['message'] = 'Depósito realizado com sucesso, status: ' . $response->status();
            }
            return $ret;
        } catch (\Throwable $th) {
            //throw $th;
            $ret['message'] = 'Erro ao depositar na conta do cliente, status: ' . $response->status();
            $ret['message'] .= $th->getMessage();
            $ret['error'] = $th->getMessage();
            $ret['data'] = $data;
        }
        // dd($headers,$ret);
        return $ret;
    }
    /**
     * cadastra um usuario ativo na alloyal
     */
    public function create_user_atived($d_send,$client_id=null){
        if(!$this->isIntegrationActive()){
            return ['exec'=>false,'message'=>'Integração Alloyal inativa'];
        }
        $headers = [
            'X-ClientEmployee-Email' => $this->clientEmployeeEmail,
            'X-ClientEmployee-Token' => $this->clientEmployeeToken,
            'Content-Type' => 'application/json'
        ];
        //se não tiver os dados para preencher o body, retornar erro
        if(!isset($d_send['name']) || !isset($d_send['cpf']) || !isset($d_send['email'])){
            //tiver o id do cliente busca os dados através dele
            if($client_id){
                $client = Client::find($client_id);
                $d_send['name'] = $client->name;
                $d_send['cpf'] = $client->cpf;
                $d_send['email'] = $client->email;
            }else{
                return ['exec'=>false,'message'=>'Dados incompletos'];
            }
        }
        //
        if($this->business_id_alloyal==2675 || $this->business_id_alloyal==2908){
            $body = [
                "name" => $d_send['name'],
                "cpf" => str_replace(['.','-'], '', $d_send['cpf']),
                "email" => strtolower($d_send['email']),
                "password" => $d_send['password'] ?? str_replace(['.','-'], '', $d_send['cpf']),
            ];
            $endpoint = $this->endpoint . '/users';
        }else{
            $body = [
                "name" => $d_send['name'],
                "cpf" => str_replace(['.','-'], '', $d_send['cpf']),
                // "email" => strtolower($d_send['email']),
                // "password" => $d_send['password'] ?? str_replace(['.','-'], '', $d_send['cpf']),
            ];
            $endpoint = $this->endpoint . '/authorized_users';
        }
        $ret['exec'] = false;
        $ret['message'] = 'Erro ao criar usuário';
        try {

            // dd($body,$endpoint);
            $url = $this->url_api_aloyall . $endpoint;
            $response = Http::withHeaders($headers)->post($url, $body);
            $ret['exec'] = true;
            $ret['message'] = 'Usuário criado com sucesso';
            $data = $response->json();
            $ret['data'] = $data;
            $ret['message'] = 'Usuário criado com sucesso, status: ' . $response->status();
            if($response->status() != 201 && $response->status() != 200){
                $ret['message'] = 'Erro ao Integrar com o Clube:'. ($response['data']['error'] ?? $response['message'] ?? $response['error'] ?? '').', status: ' . $response->status();
                $ret['exec'] = false;
            }
            if(!$client_id){
                $client_id = Client::where('cpf',$d_send['cpf'])->value('id');
            }
            //Faser deposito dos creditos na alloyal
            if($client_id){
                // $ret['message'] .= ', ID: ' . $client_id;
                $ret['client_type_save'] = Qlib::update_usermeta($client_id,'is_club_user',json_encode($ret));// $client_id;
                $ret['client_alloyal_save'] = Qlib::update_usermeta($client_id,'is_alloyal',json_encode($ret));// $client_id;
                //depositar na carteira
                // $ret['message'] .= ', ID do usuário: ' . $client_id;
                if(isset($data['cpf']) && $this->deposit_active){
                    $ret['data']['deposit'] = $this->fazer_deposito(['cpf'=>$data['cpf'],'client_id'=>$client_id,'description'=>'Depósito via API']);
                }
                $ret['redirect'] = $this->redirect_url_login;
            }
            return $ret;
        } catch (\Throwable $th) {
            $ret['exec'] = false;
            //throw $th;
            $ret['message'] = 'Erro ao criar usuário, status: ' . $th->getMessage();
            $ret['error'] = $th->getMessage();
            $ret['data'] = $d_send;
            return $ret;
        }
    }
    /**
     * Metodo para verificar se um usuario é cliente enviado para alloyal
     */
    public function is_alloyal($cpf){
        $client_id = $this->get_client_id($cpf);
        if(!$client_id){
            return ['exec'=>false,'message'=>'Cliente não encontrado'];
        }
        $is_alloyal = Qlib::get_usermeta($client_id,'is_alloyal');
        if($is_alloyal){
            return ['exec'=>true,'message'=>'Cliente é alloyal'];
        }
        return ['exec'=>false,'message'=>'Cliente não é alloyal'];
    }
    /**
     * Ativar um usuário
     */
    public function ativate($d_send){
        if(!$this->isIntegrationActive()){
            return ['exec'=>false,'message'=>'Integração Alloyal inativa'];
        }
        $cpf = $d_send['cpf'] ?? null;
        $name = $d_send['name'] ?? null;
        if(!$cpf){
            return ['exec'=>false,'message'=>'Dados incompletos'];
        }
        $client_id = $this->get_client_id($cpf);
        if(!$client_id){
            return ['exec'=>false,'message'=>'Cliente não encontrado'];
        }
         $headers = [
            'X-ClientEmployee-Email' => $this->clientEmployeeEmail,
            'X-ClientEmployee-Token' => $this->clientEmployeeToken,
            'Content-Type' => 'application/json'
        ];
        //manodar body atravez do esquema
        $body = [
            "name" => $name,
            "cpf" => $cpf,
        ];
        $ret['exec'] = false;
        $ret['message'] = 'Erro ao criar usuário';
        try {
            $endpoint = $this->endpoint . '/authorized_users';
            $url = $this->url_api_aloyall . $endpoint;
            $response = Http::withHeaders($headers)->post($url, $body);
            // dd($url,$headers,$response->json(),$body);
            $ret['exec'] = true;
            $ret['message'] = 'Usuário ativado com sucesso';
            $data = $response->json();
            $ret['data'] = $data;
            $ret['message'] = 'Usuário ativado com sucesso, status: ' . $response->status();
            if(!$client_id){
                $client_id = Client::where('cpf',$d_send['cpf'])->value('id');
            }

            if($client_id){
                $ret['message'] .= ', ID: ' . $client_id;
                $ret['client_id'] = Qlib::update_usermeta($client_id,'is_mileto_user',json_encode($ret));// $client_id;
                $ret['client_id'] = Qlib::update_usermeta($client_id,'is_alloyal',json_encode($ret));// $client_id;
                //depositar na carteira
                $ret['message'] .= ', ID do usuário: ' . $client_id;
                if(isset($data['cpf']) && $this->deposit_active){
                    $ret['data']['deposit'] = $this->fazer_deposito(['cpf'=>$data['cpf'],'client_id'=>$client_id,'description'=>'Depósito via API']);
                }
            }
            return $ret;
        } catch (\Throwable $th) {
            //throw $th;
            $ret['message'] = 'Erro ao criar usuário, status: ' . $th->getMessage();
            // $ret['message'] .= $th->getMessage();
            $ret['error'] = $th->getMessage();
            $ret['data'] = $d_send;
            return $ret;
        }
        return $activateAlloyal;
    }
    /**
     * Para fazer o depsito
     */
    public function fazer_deposito($config=[] ){
        if(!$this->isIntegrationActive()){
            return ['exec'=>false,'message'=>'Integração Alloyal inativa'];
        }
        $cpf = $config['cpf'] ?? null;
        // $amount = $config['amount'] ?? null;
        $description = $config['description'] ?? 'Depósito via API';
        $client_id = $config['client_id'] ?? null;
        if(!$cpf){
            return ['exec'=>false,'message'=>'Dados incompletos'];
        }
        if(!$client_id){
            $client_id = $client_id ?? $this->get_client_id($cpf);
        }
        if(!$client_id){
            return ['exec'=>false,'message'=>'Cliente não encontrado'];
        }
        $pc = new PointController();
        $points = $pc->saldo($client_id);

        if(!empty($points) && $points == null){
            return ['exec'=>false,'message'=>'Saldo de pontos '.$points.' insuficiente'];
        }
        $multinplicador = Qlib::qoption('factor_point_brl') ? Qlib::qoption('factor_point_brl') : 1;
        $amount = (int)$points * $multinplicador;

        $data = [
            'document' => $cpf,
            'amount' => $amount,
            'wallet_type' => 'external',
            'currency' => 'BRL',
            'description' => $description,
        ];
        $idendificador = Qlib::get_usermeta($client_id,'id_points');
        // dd($data,$ponts,$multinplicador);
        if($this->deposit_active){
            $ret = $this->deposit($data,$idendificador);
        }else{
            $ret = ['exec'=>false,'message'=>'Depósito não está ativo'];
        }
        if($ret['exec'] && $amount){
            // dump($client_id,$amount);
            $ret['data']['debito'] = $this->debitar($client_id,$amount);
        }
        // dd($ret);
        return $ret;
    }
    public function debitar($client_id,$valor){
        $client_id = $data['client_id'] ?? null;
        if(!$client_id){
            return ['exec'=>false,'message'=>'Dados incompletos'];
        }
        $data = [
            'client_id' => $client_id,
            'valor' => $valor*(-1),
            'tipo' => 'debito',
            'description' => 'Enviado para Alloyal',
        ];
        $pc = new PointController();
        $ret = $pc->createOrUpdate($data);
        return $ret;
    }
    public function get_client_id($cpf){
        $client = User::where('cpf',$cpf)->first();
        if($client){
            return $client->id;
        }
        return null;
    }
    /***
     * metodo para solicitar um smartlink atravez de um post 'https://api.lecupon.com/client/v2/businesses/2675/users/89776866018/smart_link'
     *
     * @param Request $request
     * @return json
     */
    public function smartLink(Request $request){
        if(!$this->isIntegrationActive()){
            return ['exec'=>false,'message'=>'Integração Alloyal inativa'];
        }
        // dd($request->all());
        $cpf = $request->input('cpf');
        $client_id = $this->get_client_id($cpf);
        if(!$client_id){
            return ['exec'=>false,'message'=>'Cliente não encontrado'];
        }
        $headers = [
            'X-ClientEmployee-Email' => $this->clientEmployeeEmail,
            'X-ClientEmployee-Token' => $this->clientEmployeeToken,
            'Content-Type' => 'application/json'
        ];
        $endpoint = $this->endpoint . '/users/'.$cpf.'/smart_link';
        // dd($endpoint);
        $url = $this->url_api_aloyall . $endpoint;
        $response = Http::withHeaders($headers)->post($url);
        // dd($url,$headers,$response->json());
        if($response->status() != 200){
            $ret['exec'] = false;
            $ret['message'] = 'Erro ao solicitar smartlink, status: ' . $response->status();
            $ret['message'] .= $response->json()['message'] ?? '';
            return $ret;
        }
        $ret['exec'] = true;
        $ret['message'] = 'Smartlink solicitado com sucesso';
        $ret['data'] = $response->json();
        return $ret;
    }

    /**
     * Método para solicitar smartlink via rota GET com CPF como parâmetro
     *
     * @param string $cpf
     * @return \Illuminate\Http\JsonResponse
     */
    public function smartLinkByCpf(string $cpf)
    {
        if(!$this->isIntegrationActive()){
            return response()->json(['exec'=>false,'message'=>'Integração Alloyal inativa'], 403);
        }
        $client_id = $this->get_client_id($cpf);
        if(!$client_id){
            return response()->json(['exec'=>false,'message'=>'Cliente não encontrado'], 404);
        }

        $headers = [
            'X-ClientEmployee-Email' => $this->clientEmployeeEmail,
            'X-ClientEmployee-Token' => $this->clientEmployeeToken,
            'Content-Type' => 'application/json'
        ];

        $endpoint = $this->endpoint . '/users/'.$cpf.'/smart_link';
        $url = $this->url_api_aloyall . $endpoint;
        // dd($url);
        try {
            $response = Http::withHeaders($headers)->post($url);
            // dd($url,$headers,$response->json());
            if($response->status() != 200){
                $error = $response->json()['error'] ?? 'Erro desconhecido';
                $ret = [
                    'exec' => false,
                    'message' => $error ?? 'Erro ao solicitar smartlink, status: ' . $response->status(),
                    'details' => $response->json()['message'] ?? 'Erro desconhecido'
                ];
                return response()->json($ret, $response->status());
            }

            $ret = [
                'exec' => true,
                'message' => 'Smartlink solicitado com sucesso',
                'data' => $response->json()
            ];

            return response()->json($ret, 200);

        } catch (\Exception $e) {
            return response()->json([
                'exec' => false,
                'message' => 'Erro interno ao processar solicitação',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $cpf)
    {
        if(!$this->isIntegrationActive()){
            return ['exec'=>false,'message'=>'Integração Alloyal inativa'];
        }
        $headers = [
            'X-ClientEmployee-Email' => $this->clientEmployeeEmail,
            'X-ClientEmployee-Token' => $this->clientEmployeeToken,
            'Content-Type' => 'application/json'
        ];
        $endpoint = $this->endpoint . '/authorized_users/' . $cpf;
        $url = $this->url_api_aloyall . $endpoint;

        $response = Http::withHeaders($headers)->delete($url);
        // dd($url,$headers,$response->json());
        if($response->status() != 200){
            $ret['exec'] = false;
            $ret['message'] = 'Erro ao excluir usuário, status: ' . $response->status();
            $ret['message'] .= $response->json()['message'] ?? '';
            return $ret;
        }
        $client_id = $this->get_client_id($cpf);
        $save = Qlib::update_usermeta($client_id,'create_user_actived',json_encode($response));
        if($save){
            $ret['exec'] = true;
            $ret['message'] = 'Usuário excluído com sucesso';
            $ret['data'] = $response->json();
        }
        return $ret;
    }
}
