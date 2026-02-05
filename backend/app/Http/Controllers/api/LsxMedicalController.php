<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class LsxMedicalController extends Controller
{
    protected PermissionService $permissionService;
    protected string $baseUrl = '';
    protected string $token = '';
    protected bool $integrationActive = false;

    public function __construct()
    {
        $this->permissionService = new PermissionService();
        $this->loadCredentialsFromApi('integracao-lsxmedical');
        if (!$this->integrationActive) {
            $envUrl = (string) (env('LSX_MEDICAL_BASE_URL') ?? '');
            $envToken = (string) (env('LSX_MEDICAL_TOKEN') ?? '');
            if ($envUrl !== '' && $envToken !== '') {
                $this->baseUrl = rtrim($envUrl, '/');
                $this->token = $envToken;
                $this->integrationActive = true;
            }
        }
    }

    /**
     * Carrega credenciais da ApiCredential pelo post_name (slug).
     * pt-BR: Define baseUrl, token e flag de integração ativa a partir do registro.
     * en-US: Sets baseUrl, token and active flag from stored ApiCredential record.
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
                $this->integrationActive = (bool)($cred['active'] ?? false);
                $cfg = isset($cred['config']) && is_array($cred['config']) ? $cred['config'] : [];
                $url = (string)($cfg['url'] ?? '');
                $pass = (string)($cfg['pass'] ?? '');
                if ($url !== '' && $pass !== '') {
                    $this->baseUrl = rtrim($url, '/');
                    $this->token = $pass;
                }
            }
        } catch (\Throwable $e) {
            // keep defaults
        }
    }

    /**
     * Verifica se a integração está ativa.
     * Checks if integration is active.
     *
     * @return bool
     */
    private function isIntegrationActive(): bool
    {
        return $this->integrationActive && $this->baseUrl !== '' && $this->token !== '';
    }

    /**
     * Retorna as credenciais resolvidas da integração LSX Medical.
     * Returns resolved integration credentials for LSX Medical.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function credentialsResolved()
    {
        $data = [
            'active' => $this->isIntegrationActive(),
            'base_url' => $this->baseUrl,
            'token_set' => $this->token !== '',
        ];
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
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->isIntegrationActive()) {
            return response()->json(['exec' => false, 'message' => 'Integração LSX Medical inativa'], 503);
        }
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

        $headers = [
            'Authorization' => 'Bearer ' . $this->token,
            'Content-Type' => 'application/json',
        ];
        $url = $this->baseUrl . '/create-patient/';
        try {
            $response = Http::withHeaders($headers)->post($url, $validated);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;
            return response()->json([
                'exec' => $ok,
                'message' => $ok ? 'Paciente criado com sucesso' : ($body['message'] ?? 'Falha ao criar paciente'),
                'data' => $body,
                'status' => $status,
            ], $ok ? 201 : $status);
        } catch (\Throwable $e) {
            return response()->json([
                'exec' => false,
                'message' => 'Erro ao comunicar com LSX Medical',
                'error' => $e->getMessage(),
            ], 500);
        }
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
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->isIntegrationActive()) {
            return response()->json(['exec' => false, 'message' => 'Integração LSX Medical inativa'], 503);
        }
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
        $headers = [
            'Authorization' => 'Bearer ' . $this->token,
            'Content-Type' => 'application/json',
        ];
        $cpfSanitized = preg_replace('/\D/', '', $cpf ?? '');
        $url = $this->baseUrl . '/update-patient/' . $cpfSanitized . '/';
        try {
            $response = Http::withHeaders($headers)->put($url, $validated);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;
            return response()->json([
                'exec' => $ok,
                'message' => $ok ? 'Paciente atualizado com sucesso' : ($body['message'] ?? 'Falha ao atualizar paciente'),
                'data' => $body,
                'status' => $status,
            ], $ok ? 200 : $status);
        } catch (\Throwable $e) {
            return response()->json([
                'exec' => false,
                'message' => 'Erro ao comunicar com LSX Medical',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

