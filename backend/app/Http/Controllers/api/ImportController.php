<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use App\Services\ExcelImportService;
use App\Services\Qlib;
use App\Models\Product;
use App\Models\Client;
use App\Models\Contract;
use App\Models\User;
use App\Services\LsxMedicalService;
use App\Services\UserEventLogger;
use App\Services\ContractEventLogger;

class ImportController extends Controller
{
    protected LsxMedicalService $lsxMedicalService;
    protected \App\Services\SulAmericaService $sulAmericaService;

    public function __construct(LsxMedicalService $lsxMedicalService, \App\Services\SulAmericaService $sulAmericaService)
    {
        $this->lsxMedicalService = $lsxMedicalService;
        $this->sulAmericaService = $sulAmericaService;
    }

    /**
     * Upload de arquivo e criação de sessão de importação.
     * Etapa 1: selecionar produto e enviar arquivo.
     *
     * @param Request $request
     * @param ExcelImportService $excel
     * @return \Illuminate\Http\JsonResponse
     */
    public function upload(Request $request, ExcelImportService $excel)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if ((int)($user->permission_id ?? 0) > 2) {
            return response()->json(['error' => 'Permissão insuficiente'], 403);
        }

        $validator = Validator::make($request->all(), [
            'product_id' => ['required', 'string', 'exists:posts,id'],
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv'],
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }
        $validated = $validator->validated();

        $productId = $validated['product_id'];
        $supplier = Qlib::getSupplier($productId); // string|null

        $path = $request->file('file')->store('imports');
        $parsed = $excel->parseFile($path, 200);

        $token = Qlib::token();
        $session = [
            'token' => $token,
            'user_id' => $user->id,
            'organization_id' => $user->organization_id ?? null,
            'product_id' => $productId,
            'supplier' => $supplier,
            'file_path' => $path,
            'headers' => $parsed['headers'],
            'required_fields' => [
                'name', 'cpf', 'email', 'celular', 'nascimento', 'genero',
                'cep', 'endereco', 'numero', 'bairro', 'cidade', 'uf',
                'codigo_do_plano', 'data_de_inicio_do_plano', 'data_de_expiracao'
            ],
            'rows_preview' => $parsed['rows'],
            'created_at' => now()->toDateTimeString(),
        ];
        Storage::put('import_sessions/' . $token . '.json', json_encode($session));

        return response()->json([
            'exec' => true,
            'message' => 'Arquivo recebido e sessão criada',
            'data' => [
                'session_token' => $token,
                'supplier' => $supplier,
                'product_id' => $productId,
                'headers' => $session['headers'],
                'required_fields' => $session['required_fields'],
                'rows_preview' => $session['rows_preview'],
            ]
        ], 201);
    }

    /**
     * Pré-visualização detalhada e validações por linha (Etapa 2).
     *
     * @param string $token
     * @param Request $request
     * @param ExcelImportService $excel
     * @param LsxMedicalService $lsx
     * @return \Illuminate\Http\JsonResponse
     */
    public function preview(string $token, Request $request, ExcelImportService $excel, LsxMedicalService $lsx)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if ((int)($user->permission_id ?? 0) !== 1) {
            return response()->json(['error' => 'Permissão insuficiente'], 403);
        }

        $payload = $this->loadSession($token);
        if (!$payload) {
            return response()->json(['message' => 'Sessão não encontrada'], 404);
        }
        // Reparse (caso o arquivo tenha sido atualizado)
        $parsed = $excel->parseFile($payload['file_path'], 1000);
        $rows = $parsed['rows'];
        $productId = $payload['product_id'];
        $supplier = $payload['supplier'];

        $resultRows = [];
        foreach ($rows as $i => $row) {
            $cpf = isset($row['cpf']) ? preg_replace('/\D/', '', (string)$row['cpf']) : null;
            $nameFull = trim(((string)($row['name'] ?? '')) . ' ' . ((string)($row['sobrenome'] ?? '')));
            if ($nameFull === '') {
                $nameFull = (string)($row['name'] ?? '');
            }
            $email = isset($row['email']) ? trim((string)$row['email']) : null;
            $celular = isset($row['celular']) ? preg_replace('/\D/', '', (string)$row['celular']) : null;

            $validCpf = $cpf ? Qlib::validaCpf($cpf) : false;
            $messages = [];
            if (!$cpf) {
                $messages[] = 'CPF ausente';
            } elseif (!$validCpf) {
                $messages[] = 'CPF inválido';
            }
            if (!$nameFull) {
                $messages[] = 'Nome ausente';
            }
            if (!$email) {
                $messages[] = 'Email ausente';
            }
            if (!$celular) {
                $messages[] = 'Celular ausente';
            }
            $existsClient = false;
            $clientRef = null;
            if ($cpf) { // Tenta obter dados do cliente
                $clientRef = Client::where('cpf', $cpf)->first();
                if ($clientRef) {
                    // Tenta obter dados do cliente
                    $configVal = $clientRef->config;
                    $clientConfig = is_array($configVal) ? $configVal : [];
                    if (empty($clientConfig) && is_string($configVal)) {
                        $decoded = json_decode($configVal, true);
                        if (is_array($decoded)) {
                            $clientConfig = $decoded;
                        }
                    }
                }
                $existsClient = (bool) $clientRef;
            } elseif ($email) {
                $clientRef = Client::where('email', $email)->first();
                $existsClient = (bool) $clientRef;
            }

            $existingContract = null;
            if ($existsClient && $productId) {
                $existingContract = Contract::where('client_id', $clientRef->id)
                    ->where('product_id', $productId)
                    ->where('status', '!=', 'cancelled')
                    ->whereNull('deleted_at')
                    ->where('end_date', '>=', now()->format('Y-m-d'))
                    ->first();
                if ($existingContract) {
                    $messages[] = 'Contrato já existente para o produto';
                }
            }

            $lsxPayload = null;
            if ($supplier && stripos($supplier, 'LSX') !== false) {
                // Criar um User transitório para gerar payload
                $transientUser = new User([
                    'name' => (string)$nameFull,
                    'cpf' => (string)($cpf ?? ''),
                    'email' => (string)($email ?? ''),
                    'celular' => (string)($celular ?? ''),
                    'config' => [
                        'nascimento' => $row['nascimento'] ?? null,
                        'genero' => $row['genero'] ?? null,
                        'cep' => $row['cep'] ?? null,
                        'endereco' => $row['endereco'] ?? null,
                        'numero' => $row['numero'] ?? null,
                        'bairro' => $row['bairro'] ?? null,
                        'cidade' => $row['cidade'] ?? null,
                        'uf' => $row['uf'] ?? null,
                        'codigo_do_plano' => $row['codigo_do_plano'] ?? $row['insurance_plan_code'] ?? null,
                        'data_de_inicio_do_plano' => $row['data_de_inicio_do_plano'] ?? $row['plan_adherence_date'] ?? null,
                        'data_de_expiracao' => $row['data_de_expiracao'] ?? $row['plan_expiry_date'] ?? null,
                    ],
                ]);
                $lsxPayload = $lsx->buildPayload($transientUser, [
                    'extra_fields' => [
                        'tipo' => 'TITULAR',
                        'status' => 'ATIVO',
                    ],
                ]);
            }

            $resultRows[] = [
                'index' => $i,
                'row' => $row,
                'validations' => [
                    'cpf_valid' => $validCpf,
                    'email_present' => (bool)$email,
                    'celular_present' => (bool)$celular,
                    'client_exists' => $existsClient,
                    'existing_contract' => (bool)$existingContract,
                ],
                'lsx_payload' => $lsxPayload,
                'messages' => $messages,
            ];
        }

        return response()->json([
            'exec' => true,
            'message' => 'Prévia gerada',
            'data' => [
                'supplier' => $supplier,
                'product_id' => $productId,
                'headers' => $parsed['headers'],
                'rows' => $resultRows,
            ],
        ]);
    }

    /**
     * Commit: cria clientes e contratos para linhas selecionadas.
     * Dispara integração LSX quando aplicável.
     *
     * @param string $token
     * @param Request $request
     * @param ExcelImportService $excel
     * @param LsxMedicalService $lsx
     * @return \Illuminate\Http\JsonResponse
     */
    public function commit(string $token, Request $request, ExcelImportService $excel, LsxMedicalService $lsx)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if ((int)($user->permission_id ?? 0) !== 1) {
            return response()->json(['error' => 'Permissão insuficiente'], 403);
        }
        $payload = $this->loadSession($token);
        if (!$payload) {
            return response()->json(['message' => 'Sessão não encontrada'], 404);
        }
        $validator = Validator::make($request->all(), [
            'selected' => ['required', 'array'],
        ]);
        if ($validator->fails()) {
            return response()->json(['message' => 'Erro de validação', 'errors' => $validator->errors()], 422);
        }

        $parsed = $excel->parseFile($payload['file_path'], 5000);
        $rows = $parsed['rows'];
        $productId = $payload['product_id'];
        $supplier = $payload['supplier'];

        $results = [];
        foreach ($request->get('selected') as $idx) {
            $row = $rows[$idx] ?? null;
            if (!$row) {
                $results[] = ['index' => $idx, 'exec' => false, 'mens' => 'Linha não encontrada'];
                continue;
            }
            $cpf = isset($row['cpf']) ? preg_replace('/\D/', '', (string)$row['cpf']) : null;
            $email = isset($row['email']) ? trim((string)$row['email']) : null;
            $celular = isset($row['celular']) ? preg_replace('/\D/', '', (string)$row['celular']) : null;
            $name = trim(((string)($row['name'] ?? '')) . ' ' . ((string)($row['sobrenome'] ?? '')));
            if ($name === '') {
                $name = (string)($row['name'] ?? '');
            }

            if (!$cpf) {
                $results[] = ['index' => $idx, 'exec' => false, 'mens' => 'CPF ausente'];
                continue;
            }
            if (!Qlib::validaCpf($cpf)) {
                $results[] = ['index' => $idx, 'exec' => false, 'mens' => 'CPF inválido'];
                continue;
            }
            if (!$name) {
                $results[] = ['index' => $idx, 'exec' => false, 'mens' => 'Nome ausente'];
                continue;
            }

            // Cliente existente?
            $client = Client::where('cpf', $cpf)->first();
            if (!$client) {
                // Criar cliente (PF) com defaults semelhantes ao ClientController
                $clientData = [
                    'tipo_pessoa' => 'pf',
                    'name' => $name,
                    'cpf' => $cpf,
                    'email' => $email,
                    'celular' => $celular,
                    'genero' => isset($row['genero']) ? mb_strtolower((string)$row['genero']) : 'ni',
                    'organization_id' => $user->organization_id,
                    'autor' => $user->id,
                    'permission_id' => 7,
                    'config' => json_encode([
                        'nascimento' => $row['nascimento'] ?? null,
                        'cep' => $row['cep'] ?? null,
                        'endereco' => $row['endereco'] ?? null,
                        'numero' => $row['numero'] ?? null,
                        'bairro' => $row['bairro'] ?? null,
                        'cidade' => $row['cidade'] ?? null,
                        'uf' => $row['uf'] ?? null,
                        'codigo_do_plano' => $row['codigo_do_plano'] ?? $row['insurance_plan_code'] ?? null,
                        'data_de_inicio_do_plano' => $row['data_de_inicio_do_plano'] ?? $row['plan_adherence_date'] ?? null,
                        'data_de_expiracao' => $row['data_de_expiracao'] ?? $row['plan_expiry_date'] ?? null,
                    ]),
                    'ativo' => 's',
                    'status' => 'actived',
                    'verificado' => 'n',
                    'excluido' => 'n',
                    'deletado' => 'n',
                    'token' => Qlib::token(),
                    'password' => \Illuminate\Support\Facades\Hash::make($cpf),
                ];
                $client = Client::create($clientData);

                // Log client creation
                UserEventLogger::log(
                    $client,
                    'user_created',
                    "Cliente criado com sucesso via importação por " . ($user->name ?? $user->id),
                    [],
                    $client->toArray(),
                    ['source' => 'ImportController@commit']
                );

                // Integração Alloyal (sem falhar o commit caso haja erro)
                try {
                    $payloadAlloyal = [
                        'name' => $name,
                        'cpf' => (string)$cpf,
                        'email' => (string)($email ?? ''),
                        'password' => (string)$cpf,
                    ];
                    $alloyal = new \App\Http\Controllers\api\AlloyalController();
                    $alloyal->create_user_atived($payloadAlloyal, $client->id);
                } catch (\Throwable $e) {}
            }

            // Verificar contrato existente válido
            $existsContract = Contract::where('client_id', $client->id)
                ->where('product_id', $productId)
                ->where('status', '!=', 'cancelled')
                ->whereNull('deleted_at')
                ->where('end_date', '>=', now()->format('Y-m-d'))
                ->exists();
            if ($existsContract) {
                $results[] = ['index' => $idx, 'exec' => false, 'mens' => 'Contrato já existente para o produto'];
                continue;
            }

            // Criar contrato
            $contractData = [
                'client_id' => $client->id,
                'owner_id' => $user->id,
                'organization_id' => $user->organization_id,
                'product_id' => $productId,
                'status' => 'pending',
                'start_date' => now()->format('Y-m-d'),
                'end_date' => now()->copy()->addYear()->format('Y-m-d'),
                'token' => uniqid(),
            ];
            $contract = Contract::create($contractData);

            // Log contract creation
            ContractEventLogger::logStatusChange(
                $contract,
                null,
                'pending',
                'Contrato criado via importação.',
                [],
                null,
                $user->id
            );

            $mens = 'Cliente e contrato criados';
            // Integração LSX quando aplicável
            if ($supplier && stripos($supplier, 'LSX') !== false) {
                try {
                    if ($lsx->isIntegrationActive()) {
                        $retLsx = $lsx->createPatient($client, [
                            'name' => $name,
                            'cpf' => $cpf,
                            'email' => $email,
                            'celular' => $celular,
                            'nascimento' => $row['nascimento'] ?? null,
                            'genero' => $row['genero'] ?? null,
                            'zip_code' => $row['cep'] ?? null,
                            'street' => $row['endereco'] ?? null,
                            'number' => $row['numero'] ?? null,
                            'neighborhood' => $row['bairro'] ?? null,
                            'city' => $row['cidade'] ?? null,
                            'state' => $row['uf'] ?? null,
                            'codigo_do_plano' => $row['codigo_do_plano'] ?? $row['insurance_plan_code'] ?? null,
                            'data_de_inicio_do_plano' => $row['data_de_inicio_do_plano'] ?? $row['plan_adherence_date'] ?? null,
                            'data_de_expiracao' => $row['data_de_expiracao'] ?? $row['plan_expiry_date'] ?? null,
                            'extra_fields' => [
                                'tipo' => 'TITULAR',
                                'status' => 'ATIVO',
                            ],
                        ]);
                        Qlib::update_contract_meta($contract->id, 'integration_lsx_medical', json_encode($retLsx));
                        if (isset($retLsx['exec']) && $retLsx['exec'] === true) {
                            $oldStatus = $contract->status;
                            $contract->update(['status' => 'approved']);
                            \App\Services\ContractEventLogger::logStatusChange(
                                $contract,
                                $oldStatus,
                                'approved',
                                'Contrato aprovado automaticamente via integração LSX (import).',
                                ['integration_response' => $retLsx],
                                json_encode($retLsx),
                                $user->id
                            );
                            $mens .= ' | Integração LSX aprovada';
                        } else {
                            $mens .= ' | Integração LSX falhou';
                            \App\Services\ContractEventLogger::log(
                                $contract,
                                'integration_error_import',
                                'Falha na integração LSX (import)',
                                ['integration_response' => $retLsx],
                                json_encode($retLsx),
                                $user->id
                            );
                        }
                    }
                } catch (\Throwable $e) {
                    \App\Services\ContractEventLogger::log(
                        $contract,
                        'integration_exception_import',
                        'Exceção na integração LSX (import): ' . $e->getMessage(),
                        ['trace' => $e->getTraceAsString()],
                        json_encode(['error' => $e->getMessage()]),
                        $user->id
                    );
                }
            }
            // Integração SulAmérica quando aplicável
            elseif (isset($this->sulAmericaService) && $supplier && stripos($supplier, 'SulAmerica') !== false) {
                try {
                    $resSa = $this->sulAmericaService->processIntegration($contract, $user->id);
                    if ($resSa['exec']) {
                        $mens .= ' | Integrado SulAmérica';
                    } else {
                        $mens .= ' | Falha SulAmérica: ' . ($resSa['mens'] ?? 'Erro desconhecido');
                    }
                } catch (\Throwable $e) {
                    $mens .= ' | Exceção SulAmérica: ' . $e->getMessage();
                }
            }
            $results[] = [
                'index' => $idx,
                'exec' => true,
                'mens' => $mens,
                'client_id' => $client->id,
                'contract_id' => $contract->id,
            ];
        }

        return response()->json([
            'exec' => true,
            'message' => 'Commit executado',
            'data' => $results,
        ]);
    }

    /**
     * Carrega sessão de importação do storage.
     *
     * @param string $token
     * @return array|null
     */
    protected function loadSession(string $token): ?array
    {
        $path = 'import_sessions/' . $token . '.json';
        if (!Storage::exists($path)) {
            return null;
        }
        $json = Storage::get($path);
        $data = json_decode($json, true);
        return is_array($data) ? $data : null;
    }
}
