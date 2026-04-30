<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Services\PermissionService;
use App\Services\IzaService;
use App\Services\Qlib;
use App\Services\ContractEventLogger;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Http\Request;

class IzaController extends Controller
{
    protected PermissionService $permissionService;
    protected IzaService $izaService;

    public function __construct(IzaService $izaService)
    {
        $this->permissionService = new PermissionService();
        $this->izaService = $izaService;
    }

    /**
     * Retorna as credenciais resolvidas da integração IZA.
     * pt-BR: Endpoint de diagnóstico para verificar se a integração está ativa.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function credentialsResolved()
    {
        $data = $this->izaService->getCredentialsResolved();
        return response()->json(['exec' => true, 'data' => $data], 200);
    }

    /**
     * Submete um contrato para a IZA manualmente via API.
     * pt-BR: Endpoint para envio manual de contratos à IZA.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function submitContract(Request $request)
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
            'doc' => 'required|string|max:20',
            'name' => 'required|string|max:255',
            'birthed_at' => 'required|date',
            'email' => 'required|email|max:255',
            'main_cell_phone' => 'required|string|max:20',
            'social_name' => 'nullable|string|max:255',
            'date_begin' => 'required|date',
            'date_end' => 'required|date',
            'plan_id' => 'required|string|max:64',
            'contract_id' => 'nullable|string',
        ]);

        $contract = null;
        if (!empty($validated['contract_id'])) {
            $contract = Contract::find($validated['contract_id']);
        }

        // Dummy user para satisfazer a assinatura do service
        $dummyUser = new User();
        $result = $this->izaService->submitContract($dummyUser, $validated, $contract);

        // Se houver contrato e a submissão foi bem-sucedida, registrar evento
        if ($contract && isset($result['exec']) && $result['exec'] === true) {
            ContractEventLogger::log(
                $contract,
                'integracao_iza',
                'Contrato enviado manualmente à IZA com sucesso.',
                ['status' => 'success', 'integration_response' => $result],
                json_encode($result),
                auth()->id()
            );
        }

        $status = $result['status'] ?? ($result['exec'] ? 201 : 400);
        return response()->json($result, $status);
    }

    /**
     * Consulta o status da integração IZA de um contrato específico.
     * pt-BR: Retorna os dados armazenados no meta do contrato referentes à IZA.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function consultStatus(Request $request)
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

        $contractId = $request->query('contract_id');
        if (!$contractId) {
            return response()->json(['exec' => false, 'message' => 'contract_id é obrigatório'], 400);
        }

        $contract = Contract::find($contractId);
        if (!$contract) {
            return response()->json(['exec' => false, 'message' => 'Contrato não encontrado'], 404);
        }

        $izaData = Qlib::get_contract_meta($contract->id, 'integration_iza');
        $data = [];
        if ($izaData) {
            $data = is_array($izaData) ? $izaData : json_decode($izaData, true);
        }

        // Registrar consulta
        ContractEventLogger::log(
            $contract,
            'integration_consult',
            'Consulta de status na integração IZA',
            ['contract_id' => $contractId],
            json_encode($data),
            auth()->id()
        );

        return response()->json([
            'exec' => true,
            'message' => 'Dados da integração IZA',
            'data' => $data,
        ]);
    }
}
