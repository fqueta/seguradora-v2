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
use Carbon\Carbon;

class ContractController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Contract::with(['client', 'owner', 'organization', 'product']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('contract_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Filtros de Vigência (Periodo)
        if ($request->filled('vigencia_inicio')) {
            $query->where('start_date', '>=', $request->vigencia_inicio);
        }
        if ($request->filled('vigencia_fim')) {
            $query->where('end_date', '<=', $request->vigencia_fim);
        }

        // Security and Role-based filtering
        $user = auth()->user();
        if ($user) {
            if ($user->permission_id >= 3) {
                // Usuário restrito: vê apenas da sua organização
                $query->where('organization_id', $user->organization_id);
            } else {
                // Usuário Admin/Super: pode filtrar por organização se solicitado
                if ($request->filled('organization_id')) {
                    $query->where('organization_id', $request->organization_id);
                }
            }

            // Filtro por owner_id disponível para todos (respeitando organização se for o caso)
            if ($request->filled('owner_id')) {
                $query->where('owner_id', $request->owner_id);
            }
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
        $user = auth()->user();
        if($user){
            $data['owner_id'] = $user->id;
            if(isset($user->organization_id)){
                $data['organization_id'] = $user->organization_id;
            }
        }
        $contract = Contract::create($data);

        // Prepare default success response
        $ret = [
            'exec' => true,
            'color' => 'success',
            'mens' => 'Contrato criado com sucesso.',
            'data' => $contract
        ];
        $httpStatus = 201;

        if ($contract && $contract->status === 'approved') {
            \App\Services\ContractEventLogger::logStatusChange(
                $contract,
                null,
                'approved',
                'Contrato criado com status aprovado.',
                [],
                null,
                auth()->id()
            );
        }

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
        //dados do metacampo envio_fornecedor_sucesso deve ser enviado no campo events
        if (!$contract) {
            return response()->json([
                'exec' => false,
                'message' => 'Contrato não encontrado',
                'color' => 'danger'
            ], 404);
        }
        $contract['contato_integrado'] = [];
        $envio_fornecedor_sucesso = Qlib::get_contract_meta($contract->id, 'envio_fornecedor_sucesso');
        if ($envio_fornecedor_sucesso) {
            $successo_integra = is_array($envio_fornecedor_sucesso) ? $envio_fornecedor_sucesso : json_decode($envio_fornecedor_sucesso, true);
            // if($successo_integra && Qlib::isJson($successo_integra)){
            //     $successo_integra = json_decode($successo_integra, true);
            // }
            if(isset($successo_integra['exec'])){
                $contract['contato_integrado'] =  $successo_integra;
            }
            if (!is_array($successo_integra)) {
                $successo_integra = ['mens' => (string) $envio_fornecedor_sucesso];
            }
            if (!$contract->relationLoaded('events') || $contract->events === null) {
                $contract->setRelation('events', collect());
            }

        }

        return response()->json($contract);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $contract = Contract::find($id);

        if (!$contract) {
            return response()->json([
                'exec' => false,
                'message' => 'Contrato não encontrado',
                'color' => 'danger'
            ], 404);
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

        // Backfill owner/organization if missing
        $user = auth()->user();
        if ($user) {
            if (empty($contract->owner_id) && !isset($data['owner_id'])) {
                $data['owner_id'] = $user->id;
            }
            if (empty($contract->organization_id) && !isset($data['organization_id'])) {
                if (isset($user->organization_id)) {
                    $data['organization_id'] = $user->organization_id;
                }
            }
        }

        $contract->update($data);

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
        //se o contrato estiver cancelado envia uma mensagem de sucesso se o update foi bem succedo e avisa ao usuario que para reaprovar um novo contrato é necessário criar um novo contrato
        if ($contract->status === 'cancelled') {
            return response()->json([
                'exec' => true,
                'mens' => 'Contrato cancelado com sucesso. Para aprovar um novo contrato é necessário criar um novo contrato.'
            ]);
        }
        if ($contract->status !== 'approved') {
           $ret = $this->processSulamericaIntegration($contract);
           return response()->json($ret);
        } else {
            return response()->json([
                'exec' => true,
                'mens' => 'Contrato atualizado com sucesso',
                'data' => $contract
            ]);
        }

    }
    /**
     * List trashed contracts
     */
    public function trash(Request $request): JsonResponse
    {
        $query = Contract::onlyTrashed()->with(['client', 'owner', 'organization']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('contract_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Security and Role-based filtering (same as index)
        $user = auth()->user();
        if ($user) {
            if ($user->permission_id >= 3) {
                $query->where('organization_id', $user->organization_id);
            } else {
                if ($request->filled('organization_id')) {
                    $query->where('organization_id', $request->organization_id);
                }
            }
            if ($request->filled('owner_id')) {
                $query->where('owner_id', $request->owner_id);
            }
        }

        $perPage = $request->get('per_page', 15);
        $contracts = $query->latest()->paginate($perPage);

        return response()->json($contracts);
    }

    /**
     * Metodo para enviar para a lixeira so é permitido excluir contratos do status cancelled
     */
    public function destroy($id): JsonResponse
    {
        $contract = Contract::find($id);

        if (!$contract) {
            return response()->json([
                'exec' => false,
                'message' => 'Contrato não encontrado',
                'color' => 'danger'
            ], 404);
        }
        // dd($contract);
        if ($contract->status == 'approved') {
            return response()->json([
                'exec' => false,
                'message' => 'Contrato não pode ser excluído',
                'color' => 'danger'
            ], 400);
        }
        // $ret = $this->processSulamericaIntegration($contract);
        $contract->delete();

        return response()->json([
            'exec' => true,
            'success' => true,
            'color' => 'success',
            'mens' => 'Contrato removido com sucesso'
        ]);
    }
    /**
     * metodo para deletar permanentemente
     */
    public function forceDelete($id): JsonResponse
    {
        $contract = Contract::withTrashed()->find($id);

        if (!$contract) {
            return response()->json([
                'exec' => false,
                'message' => 'Contrato não encontrado',
                'color' => 'danger'
            ], 404);
        }

        $contract->forceDelete();

        return response()->json([
            'exec' => true,
            'success' => true,
            'color' => 'success',
            'mens' => 'Contrato removido permanentemente'
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
            'color' => 'success',
            'mens' => 'Contrato recuperado com sucesso'
        ]);
    }

    /**
     * Processa a integração com a SulAmérica se aplicável.
     * @param Contract $contract
     */
    private function processSulamericaIntegration(Contract $contract)
    {
        $ret['exec'] = false;
        $ret['color'] = 'danger';
        $ret['mens'] = '';
        try {
            $product_id = $contract['product_id'] ?? null;
            // Verifica o fornecedor do produto
            $supplier = Qlib::getSupplier($product_id);
            // dd($supplier);
            // Verifica se o fornecedor se identifica como SulAmérica
            if ($supplier && (stripos($supplier, 'SulAmerica') !== false)) {
                $client = $contract->client; // Relationship
                // dd($client);

                if ($client) {
                    //Não deve integrar se o titular for Fornecedor
                    $permission = $client->permission;
                    // dd($permission);
                    $permId = $permission ? $permission->id : null;
                    $supplierPermission = Qlib::qoption('permission_supplier_id') ?? '6';
                    if (!$permId || $permId == $supplierPermission) {
                        \App\Services\ContractEventLogger::log(
                            $contract,
                            'integracao_sulamerica',
                            'Integração não executada: titular é Fornecedor.',
                            [
                                'status' => 'skipped',
                                'reason' => 'holder_not_cliente',
                                'holder_permission' => $permId,
                            ],
                            null,
                            auth()->id()
                        );
                        return $ret;
                    }
                    // Tenta obter dados do cliente, verificando config se necessário
                    $clientConfig = is_array($client->config) ? $client->config : [];
                    if(Qlib::isJson($client->config)){
                        $clientConfig = json_decode($client->config, true);
                    }
                    // Mapeamento de Gênero
                    $sexo = strtoupper($client->genero ?? 'M'); // m -> M
                    if ($sexo == 'NI') $sexo = 'M';
                    // Data Nascimento
                    $nascimento = $clientConfig['nascimento'] ?? null;
                    $product = Qlib::getProductById($contract->product_id);
                    // Validação mínima antes de integrar
                    $documento = str_replace(['.', '-', ' '], '', $client->cpf ?? $client->cnpj ?? '');
                    $missing = [];
                    if (empty($documento)) $missing[] = 'C.P.F';
                    if (empty($nascimento)) $missing[] = 'data Nascimento';
                    // dd($missing);
                    if (!empty($missing)) {
                        \App\Services\ContractEventLogger::log(
                            $contract,
                            'integracao_sulamerica',
                            'Integração não executada: dados do titular insuficientes.',
                            [
                                'status' => 'skipped',
                                'reason' => 'insufficient_client_data',
                                'missing_fields' => $missing,
                            ],
                            null,
                            auth()->id()
                        );
                        $mensMissing = 'Campos insuficientes: ' . implode(', ', $missing);
                        $ret['mens'] = $mensMissing;
                        // dd($ret);
                        return $ret;
                    }
                    // dd($product);
                    // Preparar config para API
                    $apiConfig = [
                        'token_contrato' => $contract->token,
                        'nomeSegurado' => $client->name,
                        'dataNascimento' => $nascimento,
                        'inicioVigencia' => $contract->start_date ? Carbon::parse($contract->start_date)->format('Y-m-d') : null,
                        'fimVigencia' => $contract->end_date ? Carbon::parse($contract->end_date)->format('Y-m-d') : null,
                        'sexo' => $sexo,
                        'uf' => isset($contract->address['state']) ? $contract->address['state'] : ($clientConfig['uf'] ?? ($clientConfig['state'] ?? 'SP')),
                        //remover pontos e traços do cpf
                        'documento' => $documento,
                        'planoProduto' => (string)$product['plan'] ?? '1', //deve ser o plano do produto
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
                        $old = $contract->status;
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
                        \App\Services\ContractEventLogger::logStatusChange(
                            $contract,
                            $old,
                            'approved',
                            'Status atualizado para aprovado via integração.',
                            [],
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

                } else {
                    \App\Services\ContractEventLogger::log(
                        $contract,
                        'integracao_sulamerica',
                        'Integração não executada: titular ausente no contrato.',
                        [
                            'status' => 'skipped',
                            'reason' => 'holder_missing',
                        ],
                        null,
                        auth()->id()
                    );
                }
            } else {
                // Fornecedor não é SulAmérica: registrar skip para auditoria
                \App\Services\ContractEventLogger::log(
                    $contract,
                    'integracao_sulamerica',
                    'Integração não aplicável: fornecedor do produto não é SulAmérica.',
                    [
                        'status' => 'skipped',
                        'reason' => 'supplier_not_sulamerica',
                        'supplier' => $supplier,
                    ],
                    null,
                    auth()->id()
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Erro na automação SulAmerica: ' . $e->getMessage());
            $ret['exec'] = false;
            $ret['mens'] = $e->getMessage();
        }
        return $ret;
    }
    public function cancelarContrato(Request $request, $id)
    {
        $contract = Contract::find($id);

        if (!$contract) {
            return response()->json([
                'exec' => false,
                'message' => 'Contrato não encontrado',
                'color' => 'danger'
            ], 404);
        }

        if ($contract->status !== 'approved') {
            return response()->json([
                'exec' => false,
                'message' => 'Apenas contratos aprovados podem ser cancelados.',
                'color' => 'danger'
            ], 400);
        }

        //Verificar quem é o fornecedor do produto
        $supplier = Qlib::getSupplier($contract->product_id);

        $integrationResult = null;
        $integrationSuccess = true; // Assume success if no integration is needed, unless proven otherwise

        // Log de início da operação de cancelamento (auditoria de integração)
        \App\Services\ContractEventLogger::log(
            $contract,
            'cancelamento_integracao',
            'Início do cancelamento do contrato',
            ['supplier' => $supplier],
            null,
            auth()->id()
        );

        if($supplier == 'SulAmerica'){
            //Verificar o metadata do envio_fornecedor_sucesso
            $metadata = Qlib::get_contract_meta($contract->id, 'envio_fornecedor_sucesso');
            $metadata = json_decode($metadata, true);
            if(isset($metadata['exec']) && $metadata['exec'] == true && isset($metadata['data']['numOperacao'])){
                $numeroOperacao = $metadata['data']['numOperacao']??null;
                $canalVenda = $metadata['data']['canalVenda']??null;
                $mesAnoFatura = $metadata['data']['mesAnoFatura']??null;
                $id_contrato = $contract->id;

                $saController = new SulAmericaController();
                $apiConfig = [
                    'numeroOperacao' => $numeroOperacao,
                    'canalVenda' => $canalVenda,
                    'mesAnoFatura' => $mesAnoFatura,
                    'id_contrato' => $id_contrato,
                ];

                $response = $saController->cancelamento($apiConfig);
                $integrationResult = $response;

                // Check if integration failed
                if (!isset($response['exec']) || $response['exec'] !== true) {
                    $integrationSuccess = false;
                }
            } else {
                // If expected metadata is missing, we might not be able to cancel correctly with the integration
                // For now, let's treat it as a failure to be safe, or allow manual override?
                // Based on request, strict check seems better.
                if ($request->input('force_cancel', false) !== true) {
                    // Log de erro por metadados ausentes
                    \App\Services\ContractEventLogger::log(
                        $contract,
                        'cancelamento_integracao',
                        'Dados de integração incompletos para cancelamento na SulAmérica.',
                        ['status' => 'error', 'reason' => 'metadata_missing'],
                        null,
                        auth()->id()
                    );
                    return response()->json([
                        'exec' => false,
                        'mens' => 'Dados de integração incompleto para cancelamento na SulAmérica.',
                        'message' => 'Dados de integração incompleto para cancelamento na SulAmérica.',
                        'color' => 'danger'
                    ], 400);
                }
            }
        }
        else {
            // Fornecedor não é SulAmérica: registrar skip para auditoria
            \App\Services\ContractEventLogger::log(
                $contract,
                'cancelamento_integracao',
                'Integração não aplicável ao cancelamento: fornecedor do produto não é SulAmérica.',
                [
                    'status' => 'skipped',
                    'reason' => 'supplier_not_sulamerica',
                    'supplier' => $supplier,
                ],
                null,
                auth()->id()
            );
        }

        if ($integrationSuccess) {
            $oldStatus = $contract->status;
            $contract->update(['status' => 'cancelled']);

            // Log de sucesso da integração antes da mudança de status
            \App\Services\ContractEventLogger::log(
                $contract,
                'cancelamento_integracao',
                'Cancelamento na integração concluído com sucesso',
                ['status' => 'success'],
                is_array($integrationResult) ? json_encode($integrationResult) : null,
                auth()->id()
            );

            // Log status change
            \App\Services\ContractEventLogger::logStatusChange(
                $contract,
                $oldStatus,
                'cancelled',
                'Contrato cancelado com sucesso.',
                ['integration_response' => $integrationResult],
                null,
                auth()->id()
            );

            return response()->json([
                'exec' => true,
                'mens' => 'Contrato cancelado com sucesso.',
                'message' => 'Contrato cancelado com sucesso.',
                'color' => 'success',
                'data' => $contract
            ]);
        } else {
             // Log de erro na integração
             \App\Services\ContractEventLogger::log(
                 $contract,
                 'cancelamento_integracao',
                 'Falha ao cancelar na integração: ' . ($integrationResult['mens'] ?? 'Erro desconhecido'),
                 ['status' => 'error'],
                 is_array($integrationResult) ? json_encode($integrationResult) : null,
                 auth()->id()
             );
             return response()->json([
                'exec' => false,
                'mens' => 'Falha ao cancelar na integração: ' . ($integrationResult['mens'] ?? 'Erro desconhecido'),
                'data' => $integrationResult
            ], 400);
        }
    }
}
