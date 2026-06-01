<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\User;
use App\Services\ContractEventLogger;
use App\Services\LsxMedicalV2Service;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;

class LsxMedicalV2Controller extends Controller
{
    protected PermissionService $permissionService;
    protected LsxMedicalV2Service $lsxMedicalV2Service;

    public function __construct(LsxMedicalV2Service $lsxMedicalV2Service)
    {
        $this->permissionService = new PermissionService();
        $this->lsxMedicalV2Service = $lsxMedicalV2Service;
    }

    public function credentialsResolved()
    {
        $data = $this->lsxMedicalV2Service->getCredentialsResolved();
        return response()->json(['exec' => true, 'data' => $data], 200);
    }

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

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'cpf' => 'required|string|max:20',
            'email' => 'required|email|max:255',
            'birthDate' => 'required|date',
            'gender' => 'required|string|max:16',
            'isDependent' => 'required|boolean',
            'clinicId' => 'required|string|max:128',
            'companyId' => 'nullable|string|max:128',
            'planId' => 'required|string|max:128',
            'clinicPlans' => 'required|array|min:1',
            'clinicPlans.*.clinicId' => 'required|string|max:128',
            'clinicPlans.*.planId' => 'required|string|max:128',
        ]);

        $dummyUser = new User();
        $result = $this->lsxMedicalV2Service->createClinicPatient($validated, $dummyUser);
        $status = $result['status'] ?? ($result['exec'] ? 201 : 400);

        return response()->json($result, $status);
    }

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
            'name' => 'nullable|string|max:255',
            'cpf' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'birthDate' => 'nullable|date',
            'gender' => 'nullable|string|max:16',
            'isDependent' => 'nullable|boolean',
            'clinicId' => 'nullable|string|max:128',
            'companyId' => 'nullable|string|max:128',
            'planId' => 'nullable|string|max:128',
            'clinicPlans' => 'nullable|array|min:1',
            'clinicPlans.*.clinicId' => 'required_with:clinicPlans|string|max:128',
            'clinicPlans.*.planId' => 'required_with:clinicPlans|string|max:128',
        ]);

        $validated['cpf'] = $cpf;

        $client = User::where('cpf', $cpf)->first();
        if (!$client) {
            $cpfOnlyNumbers = preg_replace('/\D/', '', $cpf);
            $client = User::whereRaw("regexp_replace(cpf, '[^0-9]', '') = ?", [$cpfOnlyNumbers])->first();
        }
        $client = $client ?? new User();

        $result = $this->lsxMedicalV2Service->updatePatient($client, array_merge($request->all(), $validated));
        $status = $result['status'] ?? ($result['exec'] ? 200 : 400);

        return response()->json($result, $status);
    }

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
        $result = $this->lsxMedicalV2Service->filterPatientsByCpf($cpf, $contractId);

        if ($contractId) {
            try {
                $contract = Contract::find($contractId);
                if ($contract) {
                    ContractEventLogger::log(
                        $contract,
                        'integration_consult',
                        'Consulta de status na LSX Medical V2',
                        ['cpf' => $cpf, 'status_code' => ($result['status'] ?? null)],
                        json_encode($result),
                        auth()->id()
                    );
                }
            } catch (\Throwable $e) {
            }
        }

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
                        Qlib::update_contract_meta($contract->id, 'integration_lsx_medical_v2', json_encode($result));
                        ContractEventLogger::logStatusChange(
                            $contract,
                            $oldStatus,
                            'approved',
                            'Contrato aprovado automaticamente via consulta LSX Medical V2 (status=ACTIVE).',
                            ['integration_response' => $result],
                            json_encode($result),
                            auth()->id()
                        );
                        $result['message'] = trim(($result['message'] ?? '') . ' | Contrato aprovado automaticamente');
                        $result['contract'] = $contract->refresh();
                    }
                }
            }
        } catch (\Throwable $e) {
            $result['auto_approve_error'] = $e->getMessage();
        }

        $status = $result['status'] ?? ($result['exec'] ? 200 : 400);
        return response()->json($result, $status);
    }

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
        $active = filter_var($request->input('active'), FILTER_VALIDATE_BOOLEAN);

        $result = $this->lsxMedicalV2Service->toggleStatus($cpf, [
            'contract_id' => $contractId,
            'status' => $active
        ]);

        $status = $result['status'] ?? ($result['exec'] ? 200 : 400);
        return response()->json($result, $status);
    }
}

