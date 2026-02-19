<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Stage;
use App\Models\User;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use App\Models\Organization;
use App\Models\Contract;
use App\Models\Permission;
use App\Services\LsxMedicalService;
use App\Services\UserEventLogger;

class ClientController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;
    public $cliente_permission_id;
    /**
     * ID de permissão para Responsáveis (clientes responsáveis).
     * EN: Permission ID for Guardians (responsáveis).
     */
    protected int $responsavel_permission_id = 8;
    public function __construct()
    {
        $optionId = Qlib::qoption('permission_client_id');
        $permId = null;
        try {
            $permId = Permission::whereIn('name', ['Cliente', 'Clientes'])->value('id');
        } catch (\Throwable $e) {
            $permId = null;
        }
        $this->cliente_permission_id = $permId ?: ($optionId ?: 10);

        $this->routeName = request()->route()->getName();
        $this->permissionService = new PermissionService();
        $this->sec = request()->segment(3);
    }

    /**
     * Listar todos os clientes
     *
     * Filtros suportados via query params:
     * - `search`: termo para buscar em `email`, `cpf`, `cnpj`, `name`.
     * - `email`, `cpf`, `cnpj`: filtros específicos por campo.
     * - `stage_id` ou `stageId`: filtra clientes pelo estágio atual (busca em JSON `config.stage_id` ou `preferencias.pipeline.stage_id`).
     * - `funnel_id` ou `funnelId`: filtra clientes pelo funil (derivado via `stage_id` -> `stages.funnel_id`).
     * - `per_page`, `order_by`, `order`: paginação e ordenação.
     */
    public function index(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Client::query()->with('organization')->orderBy($order_by, $order);

        // Security: visualiza apenas dados/cadastros de permission_id >= 3 da sua organization_id
        if ($user->permission_id >= 3) {
            $query->where('organization_id', $user->organization_id);
        }

        // Não exibir registros marcados como deletados ou excluídos
        //adicionar filtro para a lixeira onde excluido=s
        // $query->where(function($q) {
        //     $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
        // });
        if($request->filled('excluido') && $request->input('excluido') == 's'){
            $query->where('excluido', 's');
        }else{
            // Não exibir registros marcados como deletados ou excluídos
            $query->where(function($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
            $query->where(function($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            });
        }
        //adiciona filtro search por email, cpf ou cnpj ou nome
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('email', 'like', '%' . $search . '%')
                  ->orWhere('cpf', 'like', '%' . $search . '%')
                  ->orWhere('cnpj', 'like', '%' . $search . '%')
                  ->orWhere('name', 'like', '%' . $search . '%');
            });
        }
        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->input('email') . '%');
        }
        if ($request->filled('cpf')) {
            $query->where('cpf', 'like', '%' . $request->input('cpf') . '%');
        }
        if ($request->filled('cnpj')) {
            $query->where('cnpj', 'like', '%' . $request->input('cnpj') . '%');
        }
        // Filtro por stage (stage_id ou stageId) usando JSON em config/preferencias
        if ($request->filled('stage_id') || $request->filled('stageId')) {
            $stageId = (int) ($request->input('stage_id') ?? $request->input('stageId'));
            $query->where(function($q) use ($stageId) {
                $q->whereRaw("CAST(JSON_UNQUOTE(JSON_EXTRACT(`config`, '$.stage_id')) AS UNSIGNED) = ?", [$stageId])
                  ->orWhereRaw("CAST(JSON_UNQUOTE(JSON_EXTRACT(`preferencias`, '$.pipeline.stage_id')) AS UNSIGNED) = ?", [$stageId]);
            });
        }

        // Filtro por funil (funnel_id ou funnelId) derivado via stage_id
        if ($request->filled('funnel_id') || $request->filled('funnelId')) {
            $funnelId = (int) ($request->input('funnel_id') ?? $request->input('funnelId'));
            // Obter todos os stage_ids pertencentes ao funil informado
            $stageIds = \App\Models\Stage::where('funnel_id', $funnelId)->pluck('id')->all();
            $query->where(function($q) use ($stageIds) {
                if (empty($stageIds)) {
                    // Nenhum estágio para este funil: força vazio
                    $q->whereRaw('1 = 0');
                } else {
                    $placeholders = implode(',', array_fill(0, count($stageIds), '?'));
                    $q->whereRaw("CAST(JSON_UNQUOTE(JSON_EXTRACT(`config`, '$.stage_id')) AS UNSIGNED) IN ($placeholders)", $stageIds)
                      ->orWhereRaw("CAST(JSON_UNQUOTE(JSON_EXTRACT(`preferencias`, '$.pipeline.stage_id')) AS UNSIGNED) IN ($placeholders)", $stageIds);
                }
            });
        }
        //quero debugar a query em sql string completa
        // dd([
        //     'sql_string' => vsprintf($query->toSql(), $query->getBindings()),
        //     'bindings' => $query->getBindings(),
        // ]);
        $clients = $query->paginate($perPage);

        // Mapear campos para compatibilidade no resultado do index
        $clients->getCollection()->transform(function ($client) {
            return $this->mapIndexItemOutput($client);
        });

        return response()->json($clients);
    }

    /**
     * Mapeia campos de um item na listagem (index) para compatibilidade com o front-end.
     *
     * - Converte config de JSON para array e normaliza valores nulos.
     * - Adiciona alias em camelCase mantendo os originais em snake_case.
     * - Normaliza campo de ativo ('s'/'n') para booleano em "active".
     */
    private function mapIndexItemOutput($client): array
    {
        // Base em array para manipulação
        $data = is_array($client) ? $client : $client->toArray();

        // Converter config para array e substituir null por string vazia
        if (isset($data['config'])) {
            if (is_string($data['config'])) {
                $configArr = json_decode($data['config'], true) ?? [];
                array_walk($configArr, function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                    }
                });
                $data['config'] = $configArr;
            } elseif (is_array($data['config'])) {
                array_walk($data['config'], function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                    }
                });
            }
        }

        // Garantir estrutura de preferencias
        if (!isset($data['preferencias']) || !is_array($data['preferencias'])) {
            $data['preferencias'] = [];
        }
        if (!isset($data['preferencias']['pipeline']) || !is_array($data['preferencias']['pipeline'])) {
            $data['preferencias']['pipeline'] = [];
        }

        // Copiar stage_id para preferencias.pipeline a partir de config, se existir
        if (isset($data['config']) && is_array($data['config']) && isset($data['config']['stage_id'])) {
            $data['preferencias']['pipeline']['stage_id'] = $data['config']['stage_id'];
        }
        // Se preferências.pipeline.stage_id estiver presente mas config.stage_id não, reflete em config
        if (isset($data['preferencias']['pipeline']['stage_id']) && (!isset($data['config']['stage_id']) || empty($data['config']['stage_id']))) {
            $data['config']['stage_id'] = $data['preferencias']['pipeline']['stage_id'];
        }
        // Derivar funnelId via Stage quando possível
        if (isset($data['config']['stage_id']) && (!isset($data['config']['funnelId']) || empty($data['config']['funnelId']))) {
            $stageId = $data['config']['stage_id'];
            $stage = null;
            try {
                $stage = Stage::select(['id','funnel_id'])->find($stageId);
            } catch (\Exception $e) {
                $stage = null;
            }
            if ($stage && isset($stage->funnel_id)) {
                $data['config']['funnelId'] = $stage->funnel_id;
            }
        }

        // Aliases em camelCase (mantendo originais)
        $data['createdAt'] = $data['created_at'] ?? null;
        $data['updatedAt'] = $data['updated_at'] ?? null;
        $data['permissionId'] = $data['permission_id'] ?? null;
        $data['tipoPessoa'] = $data['tipo_pessoa'] ?? null;

        // Normalizar ativo para booleano em alias "active"
        if (array_key_exists('ativo', $data)) {
            $data['active'] = ($data['ativo'] === 's');
        }

        // Enriquecer autor_name quando possível
        if (isset($data['autor']) && $data['autor'] !== null && $data['autor'] !== '') {
            $autorUser = null;
            try {
                $autorUser = User::find($data['autor']);
            } catch (\Exception $e) {
                $autorUser = null;
            }
            if ($autorUser) {
                $data['autor_name'] = $autorUser->name ?? null;
            }
        }
        // Garantir chaves esperadas mesmo que nulas
        $data['points'] = $data['points'] ?? null;
        $data['is_alloyal'] = $data['is_alloyal'] ?? null;

        return $data;
    }

    /**
     * Sanitiza os dados de entrada
     */
    private function sanitizeInput($data)
    {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    $data[$key] = $this->sanitizeInput($value);
                } elseif (is_string($value)) {
                    $data[$key] = trim($value);
                }
            }
        } elseif (is_string($data)) {
            $data = trim($data);
        }
        return $data;
    }

    /**
     * Normaliza strings opcionais para null quando vazias.
     * Normalize optional string inputs to null when empty.
     */
    private function normalizeOptionalString($value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (is_string($value)) {
            $trimmed = trim($value);
            return $trimmed === '' ? null : $trimmed;
        }
        return null;
    }

    /**
     * Processa a integração de atualização com a LSX Medical se aplicável.
     */
    private function processLsxMedicalUpdate(Client $client, Request $request, LsxMedicalService $lsxMedicalService): array
    {
        $result = ['extraMsg' => null, 'retLsx' => null];
        try {
            $contracts = Contract::where('client_id', $client->id)
                ->where('status', 'approved')
                ->whereNull('deleted_at')
                ->get();

            $hasLsx = false;
            foreach ($contracts as $contract) {
                $supplierTag = Qlib::getSupplier($contract->product_id);
                if ($supplierTag && (stripos($supplierTag, 'LSX') !== false || stripos($supplierTag, 'Medical') !== false)) {
                    $hasLsx = true;
                    break;
                }
            }
            if ($hasLsx) {
                //Atualiza o paciente na LSX Medical
                $retLsx = $lsxMedicalService->updatePatient($client, $request->all());
                //atualizar o card do contrato local com a tag LSX Medical
                // Qlib::update_contract_meta($contract->id, 'integration_lsx_medical', json_encode($retLsx));
                $config = $client->config;
                if (is_string($config)) {
                    $config = json_decode($config, true) ?? [];
                }

                if (!is_array($config)) {
                    $config = [];
                }

                $config['integration_lsx_medical_update'] = $retLsx;
                $client->config = $config;
                $client->save();

                if (isset($retLsx['exec']) && !$retLsx['exec']) {
                    $msg = $retLsx['message'] ?? 'Erro na integração LSX Medical';
                    // Try to get a more specific error from the data.error field
                    if (isset($retLsx['data']['error']) && is_string($retLsx['data']['error'])) {
                        $msg = $retLsx['data']['error'];
                    }
                    $result['extraMsg'] = $msg;
                    $result['retLsx'] = $retLsx;
                }

                UserEventLogger::log(
                    $client,
                    'integration_lsx',
                    isset($retLsx['exec']) && $retLsx['exec'] 
                        ? "Atualização LSX Medical realizada com sucesso" 
                        : "Falha na atualização LSX Medical: " . ($result['extraMsg'] ?? 'Erro desconhecido'),
                    [],
                    $retLsx,
                    ['source' => 'ClientController@processLsxMedicalUpdate']
                );
            }
        } catch (\Throwable $e) {
            $result['extraMsg'] = $e->getMessage();
            
            UserEventLogger::log(
                $client,
                'integration_lsx',
                "Erro crítico na integração LSX Medical: " . $e->getMessage(),
                [],
                ['exception' => $e->getMessage(), 'trace' => $e->getTraceAsString()],
                ['source' => 'ClientController@processLsxMedicalUpdate', 'type' => 'exception']
            );
        }
        // dd($result);
        return $result;
    }

    /**
     * Criar um novo cliente
     *
     * Nota/Note: Força `permission_id = 7` na criação para
     * padronizar clientes no grupo correto.
     */
    public function store(Request $request)
    {
        $user = request()->user();
        $userOrgName = $user->organization->name ?? ($user->organization_id ?? 'N/A');

        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // 1. Limpeza e normalização inicial de todos os campos
        $email = $this->normalizeOptionalString($request->get('email'));
        $cpf = $request->get('cpf') ? preg_replace('/\D/', '', $request->get('cpf')) : null;
        $cnpj = $request->get('cnpj') ? preg_replace('/\D/', '', $request->get('cnpj')) : null;
        $celular = $request->get('celular') ? preg_replace('/\D/', '', $request->get('celular')) : null;
        $genero = $this->normalizeOptionalString($request->get('genero')) ?: 'ni';
        $tipo_pessoa = $request->get('tipo_pessoa') ?: 'pf';

        // Atualizar o request com os valores limpos para validações posteriores
        $request->merge([
            'email' => $email,
            'cpf' => $cpf,
            'cnpj' => $cnpj,
            'celular' => $celular,
            'genero' => $genero,
            'tipo_pessoa' => $tipo_pessoa,
        ]);

        // 2. Verificações de Lixeira (apenas se o campo estiver preenchido)

        // Email
        if ($email) {
            $existingEmail = Client::withoutGlobalScope('client')
                ->where('email', $email)
                ->where(function($q) {
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })
                ->first();

            if ($existingEmail) {
                return response()->json([
                    'message' => 'Este cadastro já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['email' => ['Cadastro com este e-mail está na lixeira']],
                ], 422);
            }
        }

        // Celular
        if ($celular) {
            $existingCelular = Client::withoutGlobalScope('client')
                ->where('celular', $celular)
                ->where(function($q) {
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })
                ->first();

            if ($existingCelular) {
                return response()->json([
                    'message' => 'Este cadastro já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => ['celular' => ['Cadastro com este celular está na lixeira']],
                ], 422);
            }
        }

        // CPF/CNPJ
        if ($cpf || $cnpj) {
            $existingDoc = Client::withoutGlobalScope('client')
                ->where(function($q) use ($cpf, $cnpj) {
                    if ($cpf) {
                        $q->where('cpf', $cpf);
                    }
                    if ($cnpj) {
                        if ($cpf) {
                            $q->orWhere('cnpj', $cnpj);
                        } else {
                            $q->where('cnpj', $cnpj);
                        }
                    }
                })
                ->where(function($q) {
                    $q->where('deletado', 's')->orWhere('excluido', 's');
                })
                ->first();

            if ($existingDoc) {
                $errors = [];
                if ($cpf && $existingDoc->cpf === $cpf) $errors['cpf'] = ['Cadastro com este CPF está na lixeira'];
                if ($cnpj && $existingDoc->cnpj === $cnpj) $errors['cnpj'] = ['Cadastro com este CNPJ está na lixeira'];

                return response()->json([
                    'message' => 'Este cadastro já está em nossa base de dados, verifique na lixeira.',
                    'errors'  => $errors,
                ], 422);
            }
        }

        // 3. Validação principal
        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['required', Rule::in(['pf','pj'])],
            'name'          => 'required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => 'required_if:tipo_pessoa,pf|string|max:20|unique:users,cpf',
            'cnpj'          => 'nullable|string|max:20|unique:users,cnpj',
            'email'         => 'nullable|email|unique:users,email',
            'celular'         => 'nullable|celular|unique:users,celular',
            'password'      => 'nullable|string|min:6',
            'genero'        => ['required', Rule::in(['ni','m','f'])],
            'autor'         => ['nullable','string','exists:users,id'],
            'config'        => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // Validação extra de CPF
        if (!empty($request->cpf) && !Qlib::validaCpf($request->cpf)) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();
        // Sanitização dos dados
        $validated = $this->sanitizeInput($validated);
        $validated['token'] = Qlib::token();
        //password padrão se não vor informado deve ser o CPF sem a máscara
        if(!isset($validated['password'])){
            $validated['password'] = Hash::make($validated['cpf']);
        }else{
            $validated['password'] = Hash::make($validated['password']);
        }
        $validated['ativo'] = isset($validated['ativo']) ? $validated['ativo'] : 's';
        $validated['status'] = isset($validated['status']) ? $validated['status'] : 'actived';
        $validated['tipo_pessoa'] = isset($validated['tipo_pessoa']) ? $validated['tipo_pessoa'] : 'pf';
        $validated['verificado'] = isset($validated['verificado']) ? $validated['verificado'] : 'n';
        $validated['excluido'] = isset($validated['excluido']) ? $validated['excluido'] : 'n';
        $validated['deletado'] = isset($validated['deletado']) ? $validated['deletado'] : 'n';
        $validated['permission_id'] = $this->cliente_permission_id;
        $validated['client_permission'] = [10];
        $validated['config'] = isset($validated['config']) ? $this->sanitizeInput($validated['config']) : [];

        if(is_array($validated['config'])){
            $validated['config'] = json_encode($validated['config']);
        }
        $validated['organization_id'] = $user->organization_id;
        // Autor: usar o valor enviado, se existir; caso contrário, padrão para usuário logado
        $validated['autor'] = $validated['autor'] ?? $user->id;
        // Restrição: usuários com permission_id >= 4 não podem definir outro proprietário
        if (intval($user->permission_id) >= 4) {
            $validated['autor'] = $user->id;
        }
        // Validar se o autor pertence à mesma organização
        if (isset($validated['autor'])) {
            $autorUser = User::find($validated['autor']);
            if (!$autorUser || intval($autorUser->organization_id) !== intval($validated['organization_id'])) {
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors'  => ['autor' => ['O consultor selecionado deve pertencer à mesma organização do cliente.']],
                ], 422);
            }
        }
        // dd($validated);
        $client = Client::create($validated);
        // Envio para integração Alloyal (quando aplicável)
        $alloyal_response = $this->processAlloyalIntegration($client, $request);

        // converter o client->config para array (decodificando JSON quando necessário)
        if (is_string($client->config)) {
            $decoded = json_decode($client->config, true);
            $client->config = is_array($decoded) ? $decoded : [];
        } elseif (!is_array($client->config)) {
            $client->config = [];
        }
        $ret['data'] = $client;
        $ret['message'] = 'Cliente criado com sucesso';
        $ret['status'] = 201;
        $ret['alloyal_response'] = $alloyal_response;

        UserEventLogger::log(
            $client,
            'user_created',
            "Cliente criado com sucesso por " . ($user->name ?? $user->id) . " ({$userOrgName})",
            [],
            $client->toArray(),
            ['source' => 'ClientController@store']
        );

        return response()->json($ret, 201);
    }

    /**
     * Exibir um cliente específico
     */
    public function show(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::with(['events.author'])->findOrFail($id);

        // Converter config para array (decodifica se vier como string JSON)
        if (is_string($client->config)) {
            $decoded = json_decode($client->config, true);
            $client->config = is_array($decoded) ? $decoded : [];
        } elseif (!is_array($client->config)) {
            $client->config = [];
        }

        // Add autor_name manually
        if ($client->autor) {
            $author = User::find($client->autor);
            $client->autor_name = $author ? $author->name : null;
        }
        try {
            $rawMeta = Qlib::get_usermeta($client->id, 'is_alloyal', true);
            $normalized = null;
            if (is_string($rawMeta) && $rawMeta !== '') {
                $decoded = json_decode($rawMeta, true);
                if (is_array($decoded)) {
                    if (isset($decoded['data']) && is_array($decoded['data'])) {
                        $normalized = $decoded['data'];
                    } else {
                        $normalized = $decoded;
                    }
                }
            }
            if (is_array($normalized)) {
                $normalized['id'] = isset($normalized['id']) ? (int)$normalized['id'] : ($normalized['id'] ?? null);
                $normalized['active'] = (bool)($normalized['active'] ?? $normalized['activated'] ?? false);
                if (isset($normalized['business_id'])) {
                    $normalized['business_id'] = (int)$normalized['business_id'];
                }
                if (isset($normalized['wallet']) && is_array($normalized['wallet'])) {
                    if (isset($normalized['wallet']['balance'])) {
                        $normalized['wallet']['balance'] = (float)$normalized['wallet']['balance'];
                    }
                }
                $client->is_alloyal = $normalized;
            } else {
                $client->is_alloyal = null;
            }
        } catch (\Throwable $e) {
            $client->is_alloyal = null;
        }

        return response()->json($client);
    }

    /**
     * Retorna dados do cliente
     */
    public function can_access(Request $request)
    {
        $user = $request->user();
        if(!$user){
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        return response()->json($user);
    }

    /**
     * Atualizar um cliente específico
     */
    public function update(Request $request, string $id, LsxMedicalService $lsxMedicalService)
    {
        $user = $request->user();
        $userOrgName = $user->organization->name ?? ($user->organization_id ?? 'N/A');

        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $clientToUpdate = Client::findOrFail($id);

        // 1. Limpeza e normalização inicial
        $email = $this->normalizeOptionalString($request->get('email'));
        $cpf = $request->get('cpf') ? preg_replace('/\D/', '', $request->get('cpf')) : null;
        $cnpj = $request->get('cnpj') ? preg_replace('/\D/', '', $request->get('cnpj')) : null;
        $celular = $request->get('celular') ? preg_replace('/\D/', '', $request->get('celular')) : null;

        // Atualizar o request com os valores limpos
        $request->merge([
            'email' => $email,
            'cpf' => $cpf,
            'cnpj' => $cnpj,
            'celular' => $celular,
        ]);

        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['sometimes', Rule::in(['pf','pj'])],
            'name'          => 'sometimes|required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => ['nullable','string','max:20', Rule::unique('users','cpf')->ignore($clientToUpdate->id)],
            'cnpj'          => ['nullable','string','max:20', Rule::unique('users','cnpj')->ignore($clientToUpdate->id)],
            'email'         => ['nullable','email', Rule::unique('users','email')->ignore($clientToUpdate->id)],
            'password'      => 'nullable|string|min:6',
            'genero'        => ['sometimes', Rule::in(['ni','m','f'])],
            'verificado'    => ['sometimes', Rule::in(['n','s'])],
            'autor'         => ['sometimes','string','exists:users,id'],
            'config'        => 'array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'exec'=>false,
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // Validação extra de CPF
        if (!empty($request->cpf) && !Qlib::validaCpf($request->cpf)) {
            return response()->json([
                'exec'=>false,
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();

        // Sanitização dos dados
        $validated = $this->sanitizeInput($validated);

        // Tratar senha: padrão deve ser o CPF sem máscara quando disponível
        if (isset($validated['password']) && !empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            $cpfForPassword = $request->get('cpf') ?: $clientToUpdate->cpf;
            if (!empty($cpfForPassword)) {
                $validated['password'] = Hash::make($cpfForPassword);
            } else {
                unset($validated['password']);
            }
        }

        // Garantir que permission_id seja sempre o de cliente e que client_permission contenha 10
        $validated['permission_id'] = $this->cliente_permission_id;
        if (isset($clientToUpdate->client_permission) && is_array($clientToUpdate->client_permission)) {
            $base = $clientToUpdate->client_permission;
        } else {
            $base = [];
        }
        if (!in_array(10, $base, true)) {
            $base[] = 10;
        }
        $validated['client_permission'] = $base;

        // Tratar config se fornecido
        if (isset($validated['config'])) {
            $validated['config'] = $this->sanitizeInput($validated['config']);
        if(is_array($validated['config'])){
            $validated['config'] = json_encode($validated['config']);
        }
        } // Close isset($validated['config'])

        // Backfill autor/organization if missing
        if ($user) {
            if (empty($clientToUpdate->autor) && !isset($validated['autor'])) {
                $validated['autor'] = $user->id;
            }
            if (empty($clientToUpdate->organization_id) && !isset($validated['organization_id'])) {
                if (isset($user->organization_id)) {
                    $validated['organization_id'] = $user->organization_id;
                }
            }
        }

        // Restrição: usuários com permission_id >= 4 não podem alterar proprietário
        if (intval($user->permission_id) >= 4 && isset($validated['autor'])) {
            if ($validated['autor'] !== $clientToUpdate->autor) {
                return response()->json([
                    'exec'=>false,
                    'message' => 'Permissão insuficiente para alterar o proprietário deste cliente.',
                    'errors'  => ['autor' => ['Ação não permitida para seu perfil']],
                ], 403);
            }
        }

        // Validar se o autor (quando enviado) pertence à organização alvo
        if (isset($validated['autor'])) {
            $targetOrgId = isset($validated['organization_id'])
                ? intval($validated['organization_id'])
                : intval($clientToUpdate->organization_id ?? $user->organization_id);
            $autorUser = User::find($validated['autor']);
            if (!$autorUser || intval($autorUser->organization_id) !== $targetOrgId) {
                return response()->json([
                    'exec'=>false,
                    'message' => 'Erro de validação',
                    'errors'  => ['autor' => ['O consultor selecionado deve pertencer à mesma organização do cliente.']],
                ], 422);
            }
        }

        // dd($validated);
        $clientToUpdate->update($validated);
        $ret = [
            'data' => $clientToUpdate,
            'message' => 'Cadastro atualizado',
            'status' => 200
        ];
        $extraMsg = null;
        // Envio/atualização na integração Alloyal (quando aplicável)
        $resAlloyal = $this->processAlloyalIntegration($clientToUpdate, $request);
        if (isset($resAlloyal['exec']) && !$resAlloyal['exec']) {
            $extraMsg = $resAlloyal['extraMsg'];
            $ret['retAlloyal'] = $resAlloyal['retAlloyal'] ?? null;
        }

        // Envio/atualização na integração LSX Medical (quando aplicável)
        $resLsx = $this->processLsxMedicalUpdate($clientToUpdate, $request, $lsxMedicalService);
        if ($resLsx['extraMsg']) {
            if ($extraMsg) {
                $extraMsg .= ' | ' . $resLsx['extraMsg'] . ' lsx medical';
            } else {
                $extraMsg = $resLsx['extraMsg'] . ' lsx medical';
            }
        }
        if ($resLsx['retLsx']) {
            $ret['retLsx'] = $resLsx['retLsx'];
        }

        // Converter config para array na resposta (decodifica se string JSON)
        if (is_string($clientToUpdate->config)) {
            $decoded = json_decode($clientToUpdate->config, true);
            $clientToUpdate->config = is_array($decoded) ? $decoded : [];
        } elseif (!is_array($clientToUpdate->config)) {
            $clientToUpdate->config = [];
        }

        if ($extraMsg) {
            $ret['message'] .= ' | ' . $extraMsg;
        }
        $ret['status'] = 200;

        $changes = $clientToUpdate->getChanges();
        if (isset($changes['organization_id'])) {
            $oldOrgName = Organization::find($clientToUpdate->getOriginal('organization_id'))->name ?? $clientToUpdate->getOriginal('organization_id');
            $newOrgName = Organization::find($changes['organization_id'])->name ?? $changes['organization_id'];
            
            UserEventLogger::log(
                $clientToUpdate,
                'organization_change',
                "Organização do cliente alterada de \"{$oldOrgName}\" para \"{$newOrgName}\" por " . ($user->name ?? $user->id) . " ({$userOrgName})",
                ['organization_id' => $clientToUpdate->getOriginal('organization_id')],
                ['organization_id' => $changes['organization_id']],
                ['source' => 'ClientController@update']
            );
        }
        if (isset($changes['autor'])) {
            $oldOwnerName = User::find($clientToUpdate->getOriginal('autor'))->name ?? $clientToUpdate->getOriginal('autor');
            $newOwnerName = User::find($changes['autor'])->name ?? $changes['autor'];

            UserEventLogger::log(
                $clientToUpdate,
                'owner_change',
                "Proprietário do cliente alterado de \"{$oldOwnerName}\" para \"{$newOwnerName}\" por " . ($user->name ?? $user->id) . " ({$userOrgName})",
                ['autor' => $clientToUpdate->getOriginal('autor')],
                ['autor' => $changes['autor']],
                ['source' => 'ClientController@update']
            );
        }

        UserEventLogger::log(
            $clientToUpdate,
            'user_updated',
            "Cadastro de cliente atualizado por " . ($user->name ?? $user->id) . " ({$userOrgName})",
            $clientToUpdate->getOriginal(),
            $changes,
            ['source' => 'ClientController@update']
        );

        return response()->json($ret);
    }

    /**
     * Mover cliente para a lixeira
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $userOrgName = $user->organization->name ?? ($user->organization_id ?? 'N/A');

        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::findOrFail($id);

        // Mover contratos relacionados para lixeira
        $contracts = Contract::where('client_id', $client->id)->get();
        if($contracts){
            foreach ($contracts as $contract) {
                $contract->delete();
            }
        }

        UserEventLogger::log(
            $client,
            'user_deleted',
            "Cliente movido para a lixeira por " . ($user->name ?? $user->id) . " ({$userOrgName})",
            $client->toArray(),
            ['excluido' => 's', 'deletado' => 's'],
            ['source' => 'ClientController@destroy']
        );

        // Mover para lixeira em vez de excluir permanentemente
        $client->update([
            'ativo' => 'n',
            'status' => 'inactived',
            'excluido' => 's',
            'reg_deletado' => json_encode([
                'usuario' => $user->id,
                'nome' => $user->name,
                'created_at' => now(),
            ])
        ]);

        return response()->json([
            'exec'=>true,
            'message' => 'Cliente movido para a lixeira com sucesso',
            'status' => 200
        ]);
    }

    /**
     * transferOrganization
     * pt-BR: Transfere o cliente para outra organização e atualiza seus contratos.
     *        Permitido somente para permission_id <= 2.
     * en-US: Transfers the client to another organization and updates their contracts.
     *        Allowed only for permission_id <= 2.
     */
    public function transferOrganization(Request $request, string $id)
    {
        $user = $request->user();
        $userOrgName = $user->organization->name ?? ($user->organization_id ?? 'N/A');

        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (intval($user->permission_id) > 2) {
            return response()->json(['error' => 'Permissão insuficiente'], 403);
        }

        $validator = Validator::make($request->all(), [
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'exec' => false,
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $client = Client::find($id);
        if (!$client) {
            return response()->json(['message' => 'Cliente não encontrado'], 404);
        }

        $targetOrgId = intval($validator->validated()['organization_id']);
        $targetOrg = Organization::find($targetOrgId);
        if (!$targetOrg) {
            return response()->json(['message' => 'Organização destino não encontrada'], 404);
        }

        $fromOrgId = $client->organization_id;
        $fromOrgName = Organization::find($fromOrgId)->name ?? $fromOrgId;
        $targetOrgName = $targetOrg->name ?? $targetOrgId;
        
        $client->organization_id = $targetOrgId;
        $client->save();

        UserEventLogger::log(
            $client,
            'organization_change',
            "Organização do cliente alterada de \"{$fromOrgName}\" para \"{$targetOrgName}\" por " . ($user->name ?? $user->id) . " ({$userOrgName})",
            ['organization_id' => $fromOrgId],
            ['organization_id' => $targetOrgId],
            ['source' => 'ClientController@transferOrganization']
        );

        // Atualiza todos os contratos do cliente para nova organização
        Contract::where('client_id', $client->id)->update(['organization_id' => $targetOrgId]);

        return response()->json([
            'exec' => true,
            'mens' => 'Cliente transferido e contratos atualizados com sucesso.',
            'data' => [
                'client_id' => $client->id,
                'from_organization_id' => $fromOrgId,
                'to_organization_id' => $targetOrgId,
            ],
        ]);
    }

    /**
     * changeOwner
     * pt-BR: Altera o proprietário/autor do cliente.
     *        Permitido somente para permission_id <= 2.
     *        O novo proprietário deve pertencer à mesma organização do cliente.
     */
    public function changeOwner(Request $request, string $id)
    {
        $user = $request->user();
        $userOrgName = $user->organization->name ?? ($user->organization_id ?? 'N/A');

        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (intval($user->permission_id) > 2) {
            return response()->json(['error' => 'Permissão insuficiente'], 403);
        }

        \Log::info('ChangeOwner Request', ['all' => $request->all(), 'content' => $request->getContent()]);

        $data = $request->all();
        if (empty($data)) {
            $data = $request->json()->all();
        }

        $validator = Validator::make($data, [
            'owner_id' => ['required', 'string', 'exists:users,id'],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'exec' => false,
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
                'received' => $data, // Debug info
            ], 422);
        }

        $client = Client::find($id);
        if (!$client) {
            return response()->json(['message' => 'Cliente não encontrado'], 404);
        }

        // Verifica se o cliente tem organização
        if (empty($client->organization_id)) {
            return response()->json([
                'exec' => false,
                'message' => 'Este cliente não possui uma organização definida. Por favor, defina a organização primeiro.',
            ], 400);
        }

        $newOwnerId = $validator->validated()['owner_id'];
        $newOwner = User::find($newOwnerId);

        // Verifica se o novo proprietário pertence à mesma organização
        if ($newOwner->organization_id != $client->organization_id) {
            return response()->json([
                'exec' => false,
                'message' => 'O novo proprietário deve pertencer à mesma organização do cliente.',
            ], 400);
        }

        $oldOwnerId = $client->autor;
        $oldOwnerName = User::find($oldOwnerId)->name ?? $oldOwnerId;
        $newOwnerName = $newOwner->name ?? $newOwnerId;

        $client->autor = $newOwnerId;
        $client->save();

        UserEventLogger::log(
            $client,
            'owner_change',
            "Proprietário do cliente alterado de \"{$oldOwnerName}\" para \"{$newOwnerName}\" por " . ($user->name ?? $user->id) . " ({$userOrgName})",
            ['autor' => $oldOwnerId],
            ['autor' => $newOwnerId],
            ['source' => 'ClientController@changeOwner']
        );

        return response()->json([
            'exec' => true,
            'mens' => 'Proprietário alterado com sucesso.',
            'data' => $client,
        ]);
    }

    /**
     * Converter cliente em usuário
     * - permission_id passa a ser 5
     * - o antigo permission_id é adicionado em client_permission (mantendo únicos)
     */
    public function convertToUser(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $client = Client::find($id);
        if (!$client) {
            return response()->json(['error' => 'Cliente não encontrado'], 404);
        }
        $oldPermission = intval($client->permission_id);
        $newPermission = 5;
        $list = [];
        if (is_array($client->client_permission)) {
            $list = $client->client_permission;
        } elseif (is_string($client->client_permission)) {
            $decoded = json_decode($client->client_permission, true);
            $list = is_array($decoded) ? $decoded : [];
        }
        $list[] = $oldPermission;
        $list = array_values(array_unique(array_map('intval', $list)));
        $client->client_permission = $list;
        $client->permission_id = $newPermission;
        $client->save();
        return response()->json([
            'exec' => true,
            'mens' => 'Cliente convertido em usuário com sucesso',
            'data' => $client,
        ]);
    }

    /**
     * Listar clientes na lixeira
     */
    public function trash(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Client::withoutGlobalScope('client')
            ->where('permission_id', $this->cliente_permission_id)
            ->where('deletado', 's')
            ->orderBy($order_by, $order);

        // Security: visualiza apenas dados/cadastros de permission_id >= 3 da sua organization_id
        if ($user->permission_id >= 3) {
            $query->where('organization_id', $user->organization_id);
        }

        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->input('email') . '%');
        }
        if ($request->filled('cpf')) {
            $query->where('cpf', 'like', '%' . $request->input('cpf') . '%');
        }
        if ($request->filled('cnpj')) {
            $query->where('cnpj', 'like', '%' . $request->input('cnpj') . '%');
        }

        $clients = $query->paginate($perPage);

        // Converter config para array em cada cliente
        $clients->getCollection()->transform(function ($client) {
            if (is_string($client->config)) {
                $configArr = json_decode($client->config, true) ?? [];
                array_walk($configArr, function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                    }
                });
                $client->config = $configArr;
            }
            return $client;
        });

        return response()->json($clients);
    }

    /**
     * Restaurar cliente da lixeira
     */
    public function restore(Request $request, string $id)
    {
        \Illuminate\Support\Facades\Log::error("RESTORE METHOD HIT for ID: $id");
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // 1. Attempt standard restore (Client scoped)
        // Global scope 'client' is applied automatically by Client::where
        $client = Client::where('id', $id)
            ->where(function ($query) {
                $query->where('deletado', 's')
                      ->orWhere('excluido', 's');
            })
            ->first();

        if ($client) {
            $client->update([
                'deletado' => 'n',
                'excluido' => 'n',
                'ativo' => 's',
                'status' => 'actived',
                'reg_deletado' => null
            ]);
            return response()->json([
                'message' => 'Cliente restaurado com sucesso',
                'status' => 200
            ]);
        }

        // 2. Diagnostics - why did it fail?
        $debug = Client::withoutGlobalScope('client')->find($id);

        if (!$debug) {
             return response()->json(['message' => 'Erro: Cadastro não encontrado na base de dados.'], 404);
        }

        // Check if it's actually deleted
        $isTrash = ($debug->deletado === 's' || $debug->excluido === 's');
        if (!$isTrash) {
             return response()->json(['message' => 'Este cadastro existe mas não está marcado como excluído. Verifique se ele já está ativo ou apenas com status inativo.'], 400);
        }

        // Check Permission Matches
        // This confirms if the record belongs to the "Client" scope
        $configId = $this->cliente_permission_id;
        $hasPermission = false;

        if ($debug->permission_id == $configId) {
            $hasPermission = true;
        } elseif (is_array($debug->client_permission) && in_array($configId, $debug->client_permission)) {
            $hasPermission = true;
        } elseif (is_string($debug->client_permission) && str_contains($debug->client_permission, (string)$configId)) {
            $hasPermission = true;
        }

        if (!$hasPermission) {
             return response()->json([
                 'message' => 'Permissão negada. Este registro não está associado ao perfil de clientes atual.',
                 'details' => [
                     'current_config_id' => $configId,
                     'record_permission_id' => $debug->permission_id,
                 ]
             ], 403);
        }

        return response()->json(['message' => 'Erro desconhecido ao tentar restaurar.'], 500);
    }

    /**
     * Excluir cliente permanentemente
     */
    public function forceDelete(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::where('id', $id)->firstOrFail();

        $client->delete();

        return response()->json([
            'message' => 'Cliente excluído permanentemente',
            'status' => 200
        ]);
    }

    /**
     * Listar responsáveis (clientes com permission_id=8) com paginação e filtros.
     * EN: List guardians (clients with permission_id=8) with pagination and filters.
     */
    public function responsaveisIndex(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Client::withoutGlobalScope('client')
            ->where('permission_id', $this->responsavel_permission_id)
            ->orderBy($order_by, $order);

        // Security: visualiza apenas dados/cadastros de permission_id >= 3 da sua organization_id
        if ($user->permission_id >= 3) {
            $query->where('organization_id', $user->organization_id);
        }

        // Não exibir registros marcados como deletados ou excluídos
        $query->where(function($q) {
            $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
        });
        $query->where(function($q) {
            $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
        });

        // Filtro search e campos individuais
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('email', 'like', '%' . $search . '%')
                  ->orWhere('cpf', 'like', '%' . $search . '%')
                  ->orWhere('cnpj', 'like', '%' . $search . '%')
                  ->orWhere('name', 'like', '%' . $search . '%');
            });
        }
        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->input('email') . '%');
        }
        if ($request->filled('cpf')) {
            $query->where('cpf', 'like', '%' . $request->input('cpf') . '%');
        }
        if ($request->filled('cnpj')) {
            $query->where('cnpj', 'like', '%' . $request->input('cnpj') . '%');
        }
        if ($request->filled('celular')) {
            $cel = preg_replace('/\D/', '', (string)$request->input('celular'));
            $query->where('celular', 'like', '%' . $cel . '%');
        }
        // Filtros por status simples
        if ($request->filled('ativo')) {
            $ativo = $request->input('ativo'); // esperado 's' ou 'n'
            $query->where('ativo', $ativo);
        }
        if ($request->filled('verificado')) {
            $verificado = $request->input('verificado'); // 's' ou 'n'
            $query->where('verificado', $verificado);
        }
        // Filtro por par chave/valor em config (match simples por string)
        if ($request->filled('config_key') && $request->filled('config_value')) {
            $key = $request->input('config_key');
            $val = $request->input('config_value');
            $query->where('config', 'like', '%"' . $key . '"%');
            $query->where('config', 'like', '%"' . $key . '"\s*:\s*"' . $val . '"%');
        }

        $clients = $query->paginate($perPage);

        $clients->getCollection()->transform(function ($client) {
            return $this->mapIndexItemOutput($client);
        });

        return response()->json($clients);
    }

    /**
     * Criar um novo responsável (permission_id=8).
     * EN: Create a new guardian (permission_id=8).
     */
    public function responsaveisStore(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Remover máscara do celular
        if ($request->filled('celular')) {
            $request->merge(['celular' => preg_replace('/\D/', '', $request->celular)]);
        }
        // Normalizar campos opcionais para null quando vazios
        $request->merge([
            'email'   => $this->normalizeOptionalString($request->get('email')),
            'cpf'     => $this->normalizeOptionalString($request->get('cpf')),
            'cnpj'    => $this->normalizeOptionalString($request->get('cnpj')),
            'celular' => $this->normalizeOptionalString($request->get('celular')),
        ]);

        $request->merge([
            'tipo_pessoa' => $request->get('tipo_pessoa') ? $request->get('tipo_pessoa') : 'pf',
            'genero' => $request->get('genero') ? $request->get('genero') : 'ni',
        ]);

        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['required', Rule::in(['pf','pj'])],
            'name'          => 'required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => 'nullable|string|max:20|unique:users,cpf',
            'cnpj'          => 'nullable|string|max:20|unique:users,cnpj',
            'email'         => 'nullable|email|unique:users,email',
            'celular'       => 'nullable|celular|unique:users,celular',
            'password'      => 'nullable|string|min:6',
            'genero'        => ['required', Rule::in(['ni','m','f'])],
            'config'        => 'array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if (!empty($request->cpf) && !Qlib::validaCpf($request->cpf)) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();
        $validated = $this->sanitizeInput($validated);
        $validated['token'] = Qlib::token();
        if(isset($validated['password'])){
            $validated['password'] = Hash::make($validated['password']);
        }
        $validated['ativo'] = $validated['ativo'] ?? 's';
        $validated['status'] = $validated['status'] ?? 'actived';
        $validated['tipo_pessoa'] = $validated['tipo_pessoa'] ?? 'pf';
        $validated['verificado'] = $validated['verificado'] ?? 'n';
        $validated['excluido'] = $validated['excluido'] ?? 'n';
        $validated['deletado'] = $validated['deletado'] ?? 'n';
        $validated['permission_id'] = $this->responsavel_permission_id; // força responsável
        $validated['config'] = isset($validated['config']) ? $this->sanitizeInput($validated['config']) : [];
        if(is_array($validated['config'])){
            $validated['config'] = json_encode($validated['config']);
        }

        $client = Client::create($validated);
        if (!is_array($client->config)) {
            $client->config = [];
        }
        return response()->json([
            'data' => $client,
            'message' => 'Responsável criado com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibir um responsável específico.
     * EN: Show a specific guardian.
     */
    public function responsaveisShow(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('permission_id', $this->responsavel_permission_id)
            ->firstOrFail();

        if (!is_array($client->config)) {
            $client->config = [];
        }

        return response()->json($client);
    }

    /**
     * Atualizar um responsável específico (permission_id=8).
     * EN: Update a specific guardian (permission_id=8).
     */
    public function responsaveisUpdate(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $clientToUpdate = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('permission_id', $this->responsavel_permission_id)
            ->firstOrFail();

        $request->merge([
            'email'   => $this->normalizeOptionalString($request->get('email')),
            'cpf'     => $this->normalizeOptionalString($request->get('cpf')),
            'cnpj'    => $this->normalizeOptionalString($request->get('cnpj')),
            'celular' => $this->normalizeOptionalString($request->get('celular')),
        ]);

        $validator = Validator::make($request->all(), [
            'tipo_pessoa'   => ['sometimes', Rule::in(['pf','pj'])],
            'name'          => 'sometimes|required|string|max:255',
            'razao'         => 'nullable|string|max:255',
            'cpf'           => ['nullable','string','max:20', Rule::unique('users','cpf')->ignore($clientToUpdate->id)],
            'cnpj'          => ['nullable','string','max:20', Rule::unique('users','cnpj')->ignore($clientToUpdate->id)],
            'email'         => ['nullable','email', Rule::unique('users','email')->ignore($clientToUpdate->id)],
            'password'      => 'nullable|string|min:6',
            'genero'        => ['sometimes', Rule::in(['ni','m','f'])],
            'verificado'    => ['sometimes', Rule::in(['n','s'])],
            'config'        => 'array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'exec'=>false,
                'message' => 'Erro de validação',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if (!empty($request->cpf) && !Qlib::validaCpf($request->cpf)) {
            return response()->json([
                'exec'=>false,
                'message' => 'Erro de validação',
                'errors'  => ['cpf' => ['CPF inválido']],
            ], 422);
        }

        $validated = $validator->validated();
        $validated = $this->sanitizeInput($validated);
        if (isset($validated['password']) && !empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // Garantir permission_id=8
        $validated['permission_id'] = $this->responsavel_permission_id;

        if (isset($validated['config'])) {
            $validated['config'] = $this->sanitizeInput($validated['config']);
            if (is_array($validated['config'])) {
                $validated['config'] = json_encode($validated['config']);
            }
        }

        $clientToUpdate->update($validated);

        if (!is_array($clientToUpdate->config)) {
            $clientToUpdate->config = [];
        }

        return response()->json([
            'data' => $clientToUpdate,
            'message' => 'Responsável atualizado com sucesso',
            'status' => 200,
        ]);
    }

    /**
     * Mover responsável para a lixeira.
     * EN: Move guardian to trash.
     */
    public function responsaveisDestroy(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('permission_id', $this->responsavel_permission_id)
            ->firstOrFail();

        $client->update([
            'deletado' => 's',
            'reg_deletado' => json_encode([
                'usuario' => $user->id,
                'nome' => $user->name,
                'created_at' => now(),
            ])
        ]);

        return response()->json([
            'exec'=>true,
            'message' => 'Responsável movido para a lixeira com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Listar responsáveis na lixeira.
     * EN: List guardians in trash.
     */
    public function responsaveisTrash(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Client::withoutGlobalScope('client')
            ->where('permission_id', $this->responsavel_permission_id)
            ->where('deletado', 's')
            ->orderBy($order_by, $order);

        // Filtros adicionais
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('email', 'like', '%' . $search . '%')
                  ->orWhere('cpf', 'like', '%' . $search . '%')
                  ->orWhere('cnpj', 'like', '%' . $search . '%')
                  ->orWhere('name', 'like', '%' . $search . '%');
            });
        }
        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->input('email') . '%');
        }
        if ($request->filled('cpf')) {
            $query->where('cpf', 'like', '%' . $request->input('cpf') . '%');
        }
        if ($request->filled('cnpj')) {
            $query->where('cnpj', 'like', '%' . $request->input('cnpj') . '%');
        }
        if ($request->filled('celular')) {
            $cel = preg_replace('/\D/', '', (string)$request->input('celular'));
            $query->where('celular', 'like', '%' . $cel . '%');
        }
        if ($request->filled('ativo')) {
            $query->where('ativo', $request->input('ativo'));
        }
        if ($request->filled('verificado')) {
            $query->where('verificado', $request->input('verificado'));
        }
        if ($request->filled('config_key') && $request->filled('config_value')) {
            $key = $request->input('config_key');
            $val = $request->input('config_value');
            $query->where('config', 'like', '%"' . $key . '"%');
            $query->where('config', 'like', '%"' . $key . '"\s*:\s*"' . $val . '"%');
        }

        $clients = $query->paginate($perPage);
        $clients->getCollection()->transform(function ($client) {
            if (is_string($client->config)) {
                $configArr = json_decode($client->config, true) ?? [];
                array_walk($configArr, function (&$value) {
                    if (is_null($value)) {
                        $value = (string)'';
                    }
                });
                $client->config = $configArr;
            }
            return $client;
        });

        return response()->json($clients);
    }

    /**
     * Restaurar responsável da lixeira.
     * EN: Restore guardian from trash.
     */
    public function responsaveisRestore(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('deletado', 's')
            ->where('permission_id', $this->responsavel_permission_id)
            ->firstOrFail();

        $client->update([
            'deletado' => 'n',
            'reg_deletado' => null
        ]);

        return response()->json([
            'message' => 'Responsável restaurado com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Exclusão permanente de responsável.
     * EN: Permanently delete guardian.
     */
    public function responsaveisForceDelete(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $client = Client::withoutGlobalScope('client')
            ->where('id', $id)
            ->where('permission_id', $this->responsavel_permission_id)
            ->firstOrFail();

        $client->delete();

        return response()->json([
            'message' => 'Responsável excluído permanentemente',
            'status' => 200
        ]);
    }

    /**
     * Consultar CPF (local e opcionalmente em API externa)
     * EN: Consult CPF (local and optionally in external API)
     */
    public function consultCpf(Request $request, string $cpf)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Limpar CPF (somente números)
        $cpfClean = preg_replace('/\D/', '', $cpf);

        // 1. Procurar localmente
        // PT: Busca na base local para evitar chamadas externas desnecessárias
        $client = Client::where('cpf', $cpfClean)->first();
        if ($client) {
            return response()->json([
                'exec' => true,
                'found' => 'local',
                'data' => $this->mapIndexItemOutput($client),
                'message' => 'Cliente encontrado na base local'
            ]);
        }

        // 2. Procurar em API externa (Placeholder/Mock)
        // PT: Aqui o sistema pode ser estendido para consultar SulAmérica ou provedores de dados
        // EN: Here the system can be extended to consult SulAmérica or data providers

        // Mock de resposta para demonstração se for um CPF específico ou apenas retornar não encontrado
        // No futuro, implementar Guzzle/Http para chamadas reais.

        return response()->json([
            'exec' => false,
            'found' => false,
            'message' => 'CPF não encontrado na base de dados.'
        ]);
    }

    /**
     * Processa a integração com a Alloyal
     * PT: Centraliza a lógica de envio/atualização para o Clube Alloyal
     */
    private function processAlloyalIntegration(Client $client, Request $request): array
    {
        $res = ['exec' => true, 'extraMsg' => null, 'retAlloyal' => null];
        
        try {
            $cpfPlain = $request->get('cpf') ?: $client->cpf;
            if (empty($cpfPlain)) {
                return $res;
            }

            // Determinar a senha "plain" para integração
            $plainPassword = null;
            if ($request->filled('password') && is_string($request->get('password'))) {
                $plainPassword = $request->get('password');
            } else {
                $cpfDefault = $cpfPlain;
                if (!empty($cpfDefault)) {
                    $plainPassword = (string)$cpfDefault;
                    Qlib::update_usermeta($client->id, 'alloyal_initial_password', $plainPassword);
                } else {
                    $saved = Qlib::get_usermeta($client->id, 'alloyal_initial_password', true);
                    if (is_string($saved) && $saved !== '') {
                        $plainPassword = $saved;
                    } else {
                        $plainPassword = bin2hex(random_bytes(6));
                        Qlib::update_usermeta($client->id, 'alloyal_initial_password', $plainPassword);
                    }
                }
            }

            $payloadAlloyal = [
                'name' => (string)($request->get('name') ?? $client->name ?? ''),
                'cpf' => (string)$cpfPlain,
                'email' => (string)($request->get('email') ?? $client->email ?? ''),
                'password' => (string)$plainPassword,
            ];
            $alloyalController = new \App\Http\Controllers\api\AlloyalController();
            $retAlloyal = $alloyalController->create_user_atived($payloadAlloyal, $client->id);
            // Anexar retorno no config para auditoria
            $clientConfig = $client->config;
            if (is_string($clientConfig)) {
                $clientConfig = json_decode($clientConfig, true) ?? [];
            }
                
            if (!is_array($clientConfig)) {
                $clientConfig = [];
            }
            
            $clientConfig['integration_alloyal_update'] = $retAlloyal;
            $client->config = $clientConfig;
            $client->save();

            if (isset($retAlloyal['exec']) && !$retAlloyal['exec']) {
                $res['exec'] = false;
                $res['extraMsg'] = (string)($retAlloyal['message'] ?? 'Erro na integração com o Clube');
                $res['retAlloyal'] = $retAlloyal;
            }

            UserEventLogger::log(
                $client,
                'integration_alloyal',
                isset($retAlloyal['exec']) && $retAlloyal['exec'] 
                    ? "Sincronização Alloyal realizada com sucesso" 
                    : "Falha na sincronização Alloyal: " . ($res['extraMsg'] ?? 'Erro desconhecido'),
                [],
                $retAlloyal,
                ['source' => 'ClientController@processAlloyalIntegration']
            );
        } catch (\Throwable $e) {
            $res['exec'] = false;
            $res['extraMsg'] = 'Erro interno ao processar Alloyal: ' . $e->getMessage();

            UserEventLogger::log(
                $client,
                'integration_alloyal',
                "Erro crítico na integração Alloyal: " . $e->getMessage(),
                [],
                ['exception' => $e->getMessage(), 'trace' => $e->getTraceAsString()],
                ['source' => 'ClientController@processAlloyalIntegration', 'type' => 'exception']
            );
        }

        return $res;
    }
}
