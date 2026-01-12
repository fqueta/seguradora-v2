<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use App\Services\Qlib;
use App\Http\Controllers\api\SulAmericaController;
use App\Models\Client;

class ContractController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Contract::with(['client', 'owner']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('contract_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        $perPage = $request->get('per_page', 15);
        $contracts = $query->latest()->paginate($perPage);

        return response()->json($contracts);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'nullable',
            'owner_id' => 'nullable',
            'contract_number' => 'nullable|string',
            'status' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->all();
        
        // Verifica se cliente ja tem contrato para este produto com vigencia valida e que não está na lixeira ou deletado
        if(isset($data['client_id']) && isset($data['product_id'])){
             $exists = Contract::where('client_id', $data['client_id'])
                ->where('product_id', $data['product_id'])
                ->where('status', '!=', 'cancelled')
                ->where('deleted_at', null)
                ->where('end_date', '>=', now()->format('Y-m-d'))
                ->first();
             if($exists){
                 return response()->json([
                    'exec' => false,
                    'mens' => 'Este cliente já possui um contrato válido para este produto. Id contrato: '.$exists->id.' - '.$exists->contract_number
                 ], 400); 
             }
        }
        // HasUuids trait will generate uuid
        $data['token'] = uniqid();
        
        // Create contract
        $contract = Contract::create($data);

        // Prepare default success response
        $ret = [
            'exec' => true,
            'mens' => 'Contrato criado com sucesso.',
            'data' => $contract
        ];
        $httpStatus = 201;

        if ($contract) {
             $integrationRet = $this->processSulamericaIntegration($contract);
             
             // Check integration result
             if (isset($integrationRet['exec']) && $integrationRet['exec'] === true) {
                 // Integration Success
                 $ret['data'] = $contract->refresh(); // Get updated fields
                 $ret['mens'] = 'Contrato criado e integrado com sucesso.';
             } else {
                 // Integration Failed or Skipped
                 // If there is an error message, it means it was attempted and failed
                 if (!empty($integrationRet['mens'])) {
                     $ret['mens'] = 'Contrato cadastrado com sucesso, porém houve falha na integração: ' . $integrationRet['mens'];
                     // We keep exec=true so the frontend considers it "success" (contract created) and redirects.
                     // The user sees the warning in the toast.
                 }
             }
        }

        return response()->json($ret, $httpStatus);
    }

    public function show($id): JsonResponse
    {
        $contract = Contract::with(['client', 'owner', 'events.user', 'product'])->find($id);

        if (!$contract) {
            return response()->json(['message' => 'Contrato não encontrado'], 404);
        }

        return response()->json($contract);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $contract = Contract::find($id);

        if (!$contract) {
            return response()->json(['message' => 'Contrato não encontrado'], 404);
        }

        $oldStatus = $contract->status;
        $data = $request->all();
         // Verifica se cliente ja tem contrato para este produto (excluindo este próprio) com vigencia valida
         if(isset($data['client_id']) && isset($data['product_id'])){
            $exists = Contract::where('client_id', $data['client_id'])
               ->where('product_id', $data['product_id'])
               ->where('id', '!=', $id)
               ->where('status', '!=', 'cancelled')
               ->where('end_date', '>=', now()->format('Y-m-d'))
               ->exists();
            if($exists){
                return response()->json([
                   'exec' => false,
                   'mens' => 'Este cliente já possui um contrato válido para este produto.'
                ], 400); 
            }
       }

        $contract->update($request->all());
        
        // Log status change if it changed
        if (isset($data['status']) && $oldStatus !== $contract->status) {
            // Get current user ID if authenticated
            $userId = auth()->id(); // Assuming basic auth or acting user
            \App\Services\ContractEventLogger::logStatusChange(
                $contract, 
                $oldStatus, 
                $contract->status, 
                'Status do contrato atualizado', 
                [], 
                null, 
                $userId
            );
        }

        // Se o contrato não estiver aprovado, tenta processar a integração
        // ... (rest of the code)
        if ($contract->status !== 'approved') {
           $ret = $this->processSulamericaIntegration($contract);
           return response()->json($ret);
        } else {
            return response()->json([
                'success' => true,
                'message' => 'Contrato atualizado com sucesso',
                'data' => $contract
            ]);
        }
        
    }
    /**
     * Metodo para enviar para a lixeira so é permitido excluir contratos do status cancelled
     */

    public function destroy($id): JsonResponse
    {
        $contract = Contract::find($id);

        if (!$contract) {
            return response()->json(['message' => 'Contrato não encontrado'], 404);
        }

        if ($contract->status !== 'cancelled') {
            return response()->json(['message' => 'Contrato não pode ser excluído'], 400);
        }
        // $ret = $this->processSulamericaIntegration($contract);
        $contract->delete();

        return response()->json([
            'success' => true,
            'message' => 'Contrato removido com sucesso'
        ]);
    }
    /**
     * metodo para deletar permanentemente
     */
    public function delete($id): JsonResponse
    {
        $contract = Contract::withTrashed()->find($id);

        if (!$contract) {
            return response()->json(['message' => 'Contrato não encontrado'], 404);
        }

        $contract->forceDelete();

        return response()->json([
            'success' => true,
            'message' => 'Contrato removido permanentemente'
        ]);
    }
    /**
     * Metodo para recuperar da lixeira
     */
    public function restore($id): JsonResponse
    {
        $contract = Contract::withTrashed()->find($id);

        if (!$contract) {
            return response()->json(['message' => 'Contrato não encontrado'], 404);
        }

        $contract->restore();

        return response()->json([
            'success' => true,
            'message' => 'Contrato recuperado com sucesso'
        ]);
    }

    /**
     * Processa a integração com a SulAmérica se aplicável.
     * @param Contract $contract
     */
    private function processSulamericaIntegration(Contract $contract)
    {
        $ret['exec'] = false;
        $ret['mens'] = '';
        try {
            $product_id = $contract['product_id'] ?? null;
            // Verifica o fornecedor do produto
            $supplier = Qlib::getSupplier($product_id);

            // Verifica se o fornecedor se identifica como SulAmérica
            if ($supplier && (stripos($supplier, 'SulAmerica') !== false)) {

                $client = $contract->client; // Relationship

                if ($client) {
                    // Tenta obter dados do cliente, verificando config se necessário
                    $clientConfig = is_string($client->config) ? json_decode($client->config, true) : (is_array($client->config) ? $client->config : []);

                    // Mapeamento de Gênero
                    $sexo = strtoupper($client->genero ?? 'M'); // m -> M
                    if ($sexo == 'NI') $sexo = 'M';

                    // Data Nascimento
                    $nascimento = $clientConfig['data_nascimento'] ?? ($clientConfig['nascimento'] ?? ($clientConfig['birth_date'] ?? null));
                    $product = Qlib::getProductById($contract->product_id);
                    // dd($product);
                    // Preparar config para API
                    $apiConfig = [
                        'token_contrato' => $contract->token,
                        'nomeSegurado' => $client->name,
                        'dataNascimento' => $nascimento,
                        'inicioVigencia' => $contract->start_date ? $contract->start_date->format('Y-m-d') : null,
                        'fimVigencia' => $contract->end_date ? $contract->end_date->format('Y-m-d') : null,
                        'sexo' => $sexo,
                        'uf' => isset($contract->address['state']) ? $contract->address['state'] : ($clientConfig['uf'] ?? ($clientConfig['state'] ?? 'SP')),
                        //remover pontos e traços do cpf
                        'documento' => str_replace(['.', '-', ' '], '', $client->cpf ?? $client->cnpj),
                        'planoProduto' => $product['plan'] ?? '1', //deve ser o plano do produto
                        'operacaoParceiro' => $contract->token ?? null, //deve ser o plano do produto
                        'premioSeguro' => $product['costPrice'] ?? null,
                    ];
                    // dd($apiConfig);

                    // Instancia e chama o controller
                    $saController = new SulAmericaController();
                    $response = $saController->contratacao($apiConfig);
                    
                    // Log response to contract_meta
                    $response_json = is_array($response) ? json_encode($response) : $response;
                    Qlib::update_contract_meta($contract->id, 'ultimo_envio_fornecedor', $response_json);

                    // Prepare full log payload (Request + Response)
                    $fullLogPayload = json_encode([
                        'request' => $apiConfig,
                        'response' => $response
                    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

                    // Verifica resposta e atualiza status, contract_number, c_number
                    if (isset($response['exec']) && $response['exec'] === true) {
                        $contract->update(['status' => 'approved']);
                        Qlib::update_contract_meta($contract->id, 'envio_fornecedor_sucesso', $response_json);
                        $contract_number = $response['data']['apolice']['numApolice']??null;
                        if($contract_number){
                            $contract->update(['contract_number' => $contract_number]);
                        }
                        $c_number = $response['data']['numCertificado']??null;
                        if($c_number){
                            $contract->update(['c_number' => $c_number]);
                        }

                        // Log success event
                        \App\Services\ContractEventLogger::log(
                            $contract,
                            'integracao_sulamerica',
                            'Integração SulAmérica realizada com sucesso.',
                            ['status' => 'success'],
                            $fullLogPayload,
                            auth()->id()
                        );
                    } else {
                        // Log failure event
                        $errorMsg = $response['mens'] ?? 'Erro desconhecido na integração';
                        \App\Services\ContractEventLogger::log(
                            $contract,
                            'integracao_sulamerica',
                            'Falha na integração SulAmérica: ' . $errorMsg,
                            ['status' => 'error'],
                            $fullLogPayload,
                            auth()->id()
                        );
                    }
                    $ret = $response;

                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Erro na automação SulAmerica: ' . $e->getMessage());
            $ret['exec'] = false;
            $ret['mens'] = $e->getMessage();
        }
        return $ret;
    }
}
