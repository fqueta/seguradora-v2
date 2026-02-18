<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Services\PermissionService;
use App\Services\LsxMedicalService; // Import Service
use App\Services\Qlib;
use App\Models\Contract;
use App\Services\ContractEventLogger;
use Illuminate\Http\Request;
use App\Models\User;

class LsxMedicalController extends Controller
{
    protected PermissionService $permissionService;
    protected LsxMedicalService $lsxMedicalService;

    public function __construct(LsxMedicalService $lsxMedicalService)
    {
        $this->permissionService = new PermissionService();
        $this->lsxMedicalService = $lsxMedicalService;
    }

    /**
     * Retorna as credenciais resolvidas da integração LSX Medical.
     * Returns resolved integration credentials for LSX Medical.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function credentialsResolved()
    {
        $data = $this->lsxMedicalService->getCredentialsResolved();
        return response()->json(['exec' => true, 'data' => $data], 200);
    }

    /**
     * Cria um paciente na LSX Medical.
     * Creates a patient in LSX Medical.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function createPatient(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $perm = intval($user->permission_id ?? $user->id_permission ?? 99);
        if ($perm >= 3) {
            return response()->json(['error' => 'Permissão insuficiente'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Validate basic input usually expected
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'cpf' => 'required|string|max:20',
            'email' => 'required|email|max:255',
            'birth_date' => 'required|date',
            'phone' => 'required|string|max:20',
            'insurance_plan_code' => 'required|string|max:64',
            'plan_adherence_date' => 'required|date',
            'plan_expiry_date' => 'required|date',
            'extra_fields' => 'nullable|array',
        ]);

        // Create a temporary User object or use the validated data directly?
        // The service expects a User object as the first argument mostly for extraction
        // But here we are calling it directly from an API endpoint, potentially without a saved User yet?
        // Or maybe this endpoint is used to test?
        // Let's create a dummy object to satisfy the signature if needed or adapt the service.
        // Actually, looking at the service, it extracts from $client->field OR $extraData['field'].
        // So passing a bare new User and the $validated array works.

        $dummyUser = new User();
        // We can populate attributes if we want, or rely on $validated passed as $extraData

        $result = $this->lsxMedicalService->createPatient($dummyUser, $validated);

        $status = $result['status'] ?? ($result['exec'] ? 201 : 400);

        return response()->json($result, $status);
    }

    /**
     * Atualiza um paciente na LSX Medical pelo CPF.
     * Updates a patient in LSX Medical by CPF.
     *
     * @param Request $request
     * @param string $cpf
     * @return \Illuminate\Http\JsonResponse
     */
    public function updatePatient(Request $request, string $cpf)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $perm = intval($user->permission_id ?? $user->id_permission ?? 99);
        if ($perm >= 3) {
            return response()->json(['error' => 'Permissão insuficiente'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'cpf' => 'required|string|max:20', // Although passed in URL, validating body too is fine
            'email' => 'required|email|max:255',
            'birth_date' => 'required|date',
            'phone' => 'required|string|max:20',
            'insurance_plan_code' => 'required|string|max:64',
            'plan_adherence_date' => 'required|date',
            'plan_expiry_date' => 'required|date',
            'extra_fields' => 'nullable|array',
        ]);

        // Ensure CPF from URL is used or matches
        $validated['cpf'] = $cpf;

        // Tenta encontrar o usuário pelo CPF para carregar as configurações (endereço, etc)
        $client = User::where('cpf', $cpf)->first();

        // Se não encontrar por CPF exato, tenta apenas números
        if (!$client) {
             $cpfOnlyNumbers = preg_replace('/\D/', '', $cpf);
             $client = User::whereRaw("regexp_replace(cpf, '[^0-9]', '') = ?", [$cpfOnlyNumbers])->first();
        }

        $client = $client ?? new User();

        $result = $this->lsxMedicalService->updatePatient($client, $validated);

        $status = $result['status'] ?? ($result['exec'] ? 200 : 400);

        return response()->json($result, $status);
    }

    /**
     * Consulta pacientes na LSX Medical pelo CPF.
     */
    public function filterPatients(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $perm = intval($user->permission_id ?? $user->id_permission ?? 99);
        if ($perm >= 3) {
            return response()->json(['error' => 'Permissão insuficiente'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $cpf = (string)($request->query('cpf') ?? '');
        $contractId = $request->query('contract_id');
        $result = $this->lsxMedicalService->filterPatientsByCpf($cpf, $contractId);

        // Registrar evento de consulta se houver contrato
        if ($contractId) {
            try {
                $contract = Contract::find($contractId);
                if ($contract) {
                    ContractEventLogger::log(
                        $contract,
                        'integration_consult',
                        'Consulta de status na LSX Medical',
                        ['cpf' => $cpf, 'status_code' => ($result['status'] ?? null)],
                        json_encode($result),
                        auth()->id()
                    );
                }
            } catch (\Throwable $e) {
                // silencioso
            }
        }

        // Se a consulta indicar ACTIVE e houver contract_id, aprovar e registrar
        try {
            if (($result['exec'] ?? false) === true && $contractId) {
                $statusRemote = null;
                $data = $result['data'] ?? [];
                if (is_array($data)) {
                    $first = $data['results'][0] ?? null;
                    if (is_array($first) && isset($first['status'])) {
                        $statusRemote = strtoupper((string)$first['status']);
                    }
                }
                if ($statusRemote === 'ACTIVE') {
                    $contract = Contract::find($contractId);
                    if ($contract && $contract->status !== 'approved') {
                        $oldStatus = $contract->status;
                        $contract->update(['status' => 'approved']);
                        // Atualizar meta com o resultado da consulta
                        Qlib::update_contract_meta($contract->id, 'integration_lsx_medical', json_encode($result));
                        // Logar mudança de status
                        ContractEventLogger::logStatusChange(
                            $contract,
                            $oldStatus,
                            'approved',
                            'Contrato aprovado automaticamente via consulta LSX (status=ACTIVE).',
                            ['integration_response' => $result],
                            json_encode($result),
                            auth()->id()
                        );
                        // Anexar informação ao retorno
                        $result['message'] = trim(($result['message'] ?? '').' | Contrato aprovado automaticamente');
                        $result['contract'] = $contract->refresh();
                    }
                }
            }
        } catch (\Throwable $e) {
            // Não quebrar a consulta; apenas anexar aviso
            $result['auto_approve_error'] = $e->getMessage();
        }
        $status = $result['status'] ?? ($result['exec'] ? 200 : 400);
        return response()->json($result, $status);
    }

    /**
     * Altera o status do paciente na LSX Medical pelo CPF.
     */
    public function toggleStatus(Request $request, string $cpf)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        $perm = intval($user->permission_id ?? $user->id_permission ?? 99);
        if ($perm >= 3) {
            return response()->json(['error' => 'Permissão insuficiente'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $contractId = $request->query('contract_id');
        $active = filter_var($request->input('active'), FILTER_VALIDATE_BOOLEAN); // Garante que seja boolean
        
        $result = $this->lsxMedicalService->toggleStatus($cpf, [
            'contract_id' => $contractId,
            'status' => $active
        ]);

        $status = $result['status'] ?? ($result['exec'] ? 200 : 400);
        return response()->json($result, $status);
    }
}
