<?php

namespace App\Services;

use App\Http\Controllers\api\ApiCredentialController;
use Illuminate\Support\Facades\Http;
use App\Models\User;
use App\Models\Contract;
use App\Services\ContractEventLogger;

class LsxMedicalService
{
    protected string $baseUrl = '';
    protected string $token = '';
    protected bool $integrationActive = false;

    public function __construct()
    {
        $this->loadCredentialsFromApi('integracao-lsx-medical');
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

    public function isIntegrationActive(): bool
    {
        return $this->integrationActive && $this->baseUrl !== '' && $this->token !== '';
    }

    public function getCredentialsResolved(): array
    {
        return [
            'active' => $this->isIntegrationActive(),
            'base_url' => $this->baseUrl,
            'token_set' => $this->token !== '',
            'clinic_base_url' => $this->getClinicBaseUrl(),
        ];
    }

    /**
     * Tenta extrair dados do cliente para o payload da LSX Medical.
     * Prioriza dados passados explicitamente em $extraData, depois tenta extrair de User e config.
     */
    public function buildPayload(User $client, array $extraData = []): array
    {
        // 1. Base data
        $name = $extraData['name'] ?? $client->name;
        $cpf = preg_replace('/\D/', '', $extraData['cpf'] ?? $client->cpf);
        $email = $extraData['email'] ?? $client->email;
        $phone = preg_replace('/\D/', '', $extraData['celular'] ?? $client->celular ?? $extraData['phone'] ?? '');
        // 2. Extra fields from config or $extraData
        $config = is_array($client->config) ? $client->config : (json_decode($client->config ?? '[]', true) ?? []);

        // Campos específicos
        $birthDate = $extraData['birth_date'] ?? $config['nascimento'] ?? $extraData['nascimento'] ?? null;
        if ($birthDate) {
            // Check if it's in DD/MM/YYYY format and convert to YYYY-MM-DD
            if (strpos($birthDate, '/') !== false) {
                try {
                    $birthDate = \App\Services\Qlib::dtBanco($birthDate);
                } catch (\Throwable $th) {
                    // fall through if conversion fails
                }
            }
        }
        $insurancePlanCode = $extraData['insurance_plan_code'] ?? $config['insurance_plan_code'] ?? 'PLANO001'; // Default or required?
        $planAdherenceDate = $extraData['plan_adherence_date'] ?? $config['plan_adherence_date'] ?? date('Y-m-d');
        $planExpiryDate = $extraData['plan_expiry_date'] ?? $config['plan_expiry_date'] ?? date('Y-m-d', strtotime('+1 year'));
        $extraFields = $extraData['extra_fields'] ?? $config['lsx_extra_fields'] ?? [];

        $genderRaw = $extraData['gender'] ?? $config['genero'] ?? $extraData['genero'] ?? $client->gender ?? $client->sexo ?? null;
        $gender = null;
        if ($genderRaw) {
            $gLower = mb_strtolower($genderRaw);
            if (in_array($gLower, ['m', 'masculino', 'male', 'homem'])) {
                $gender = 'M';
            } elseif (in_array($gLower, ['f', 'feminino', 'female', 'mulher'])) {
                $gender = 'F';
            } elseif (in_array($gLower, ['o', 'outro', 'other'])) {
                $gender = 'O';
            } else {
                // If it's already a single char like 'M', 'F', 'O' but upper/lower case
                $gender = strtoupper(substr($genderRaw, 0, 1));
            }
        }

        return [
            'name' => (string)$name,
            'cpf' => (string)$cpf,
            'email' => (string)$email,
            'birth_date' => $birthDate, // API expects Y-m-d usually
            'phone' => (string)$phone,
            'gender' => $gender,
            'insurance_plan_code' => (string)$insurancePlanCode,
            'plan_adherence_date' => $planAdherenceDate,
            'plan_expiry_date' => $planExpiryDate,
            'extra_fields' => $extraFields,
            'address' => [
                'zip_code' => $extraData['zip_code'] ?? $config['cep'] ?? $extraData['cep'] ?? null,
                'street' => $extraData['street'] ?? $config['endereco'] ?? $extraData['endereco'] ?? null,
                'number' => $extraData['number'] ?? $config['numero'] ?? $extraData['numero'] ?? null,
                'neighborhood' => $extraData['neighborhood'] ?? $config['bairro'] ?? $extraData['bairro'] ?? null,
                'city' => $extraData['city'] ?? $config['cidade'] ?? $extraData['cidade'] ?? null,
                'state' => $extraData['state'] ?? $config['uf'] ?? $extraData['uf'] ?? null,
            ],
        ];
    }

    /**
     * Cria um paciente na LSX Medical.
     */
    public function createPatient(User $client, array $extraData = []): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração LSX Medical inativa'];
        }

        $payload = $this->buildPayload($client, $extraData);

        // Garantir campos extras obrigatórios com padrões se não enviados
        if (!isset($payload['extra_fields']['tipo'])) {
            $payload['extra_fields']['tipo'] = 'TITULAR';
        }
        if (!isset($payload['extra_fields']['status'])) {
            $payload['extra_fields']['status'] = 'ATIVO';
        }

        // Validar campos obrigatórios mínimos para a integração
        // (A validação forte deve ser feita antes, mas aqui garantimos que não envia lixo)
        if (empty($payload['cpf']) || empty($payload['name'])) {
             return ['exec' => false, 'message' => 'Dados incompletos para integração (CPF ou Nome faltando)'];
        }

        $headers = [
            'Authorization' => 'Bearer ' . $this->token,
            'Content-Type' => 'application/json',
        ];
        $url = $this->getClinicBaseUrl() . '/create-patient/';

        try {
            $response = Http::withHeaders($headers)->post($url, $payload);
            $status = $response->status();
            $body = $response->json();
            // dd($payload, $body);
            $ok = $status >= 200 && $status < 300;
            //gravar um metacampo da requisição
            $salv = Qlib::update_contract_meta($client->id, 'lsx_medical_create_patient', $body);
            // dd($salv);
            return [
                'exec' => $ok,
                'message' => $ok ? 'Paciente criado na LSX Medical com sucesso' : ($body['message'] ?? 'Falha ao criar paciente na LSX Medical'),
                'data' => $body,
                'payload' => $payload, // Incluindo payload para log
                'status' => $status,
                'save' => $salv,
            ];
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao comunicar com LSX Medical',
                'error' => $e->getMessage(),
                'payload' => $payload, // Incluindo payload mesmo no erro
            ];
        }
    }

    /**
     * Atualiza um paciente na LSX Medical pelo CPF.
     */
    public function updatePatient(User $client, array $extraData = []): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração LSX Medical inativa'];
        }

        $payload = $this->buildPayload($client, $extraData);
        // Validar campos obrigatórios mínimos
        if (empty($payload['cpf'])) {
             return ['exec' => false, 'message' => 'CPF obrigatório para atualização'];
        }

        $headers = [
            'Authorization' => 'Bearer ' . $this->token,
            'Content-Type' => 'application/json',
        ];
        $cpfSanitized = preg_replace('/\D/', '', $payload['cpf']);
        $url = $this->getClinicBaseUrl() . '/update-patient/' . $cpfSanitized . '/';

        try {
            $response = Http::withHeaders($headers)->put($url, $payload);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;
            return [
                'exec' => $ok,
                'message' => $ok ? 'Paciente atualizado na LSX Medical com sucesso' : ($body['message'] ?? 'Falha ao atualizar paciente na LSX Medical'),
                'data' => $body,
                'status' => $status,
            ];
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao comunicar com LSX Medical',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Consulta pacientes na LSX Medical pelo CPF.
     */
    public function filterPatientsByCpf(string $cpf): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração LSX Medical inativa'];
        }
        $cpfOnly = preg_replace('/\D/', '', $cpf);
        if (empty($cpfOnly)) {
            return ['exec' => false, 'message' => 'CPF inválido para consulta'];
        }
        $headers = [
            'Authorization' => 'Bearer ' . $this->token,
        ];
        $url = $this->getClinicBaseUrl() . '/filter-patients';
        try {
            $response = Http::withHeaders($headers)->get($url, ['cpf' => $cpfOnly]);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;
            return [
                'exec' => $ok,
                'message' => $ok ? 'Consulta realizada com sucesso' : ($body['message'] ?? 'Falha na consulta'),
                'data' => $body,
                'status' => $status,
            ];
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao consultar pacientes na LSX Medical',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Retorna a base dos endpoints de clínica da LSX, normalizando credenciais.
     */
    private function getClinicBaseUrl(): string
    {
        $base = rtrim($this->baseUrl, '/');
        // Se já contém /api/clinic, retorna como está
        if (preg_match('#/api/clinic$#', $base)) {
            return $base;
        }
        // Se termina com /api, acrescente /clinic
        if (preg_match('#/api$#', $base)) {
            return $base . '/clinic';
        }
        // Caso contrário, acrescente /api/clinic
        return $base . '/api/clinic';
    }
    /**
     * Cancela/Inativa um paciente na LSX Medical pelo CPF usando PATCH.
     */
    public function cancelPatient(User $client, array $extraData = []): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração LSX Medical inativa'];
        }

        $cpf = preg_replace('/\D/', '', $extraData['cpf'] ?? $client->cpf);
        if (empty($cpf)) {
             return ['exec' => false, 'message' => 'CPF obrigatório para cancelamento'];
        }

        $headers = [
            'Authorization' => 'Bearer ' . $this->token,
            'Content-Type' => 'application/json',
        ];

        // Payload específico para cancelamento conforme exemplo do usuário
        $payload = [
            'extra_fields' => [
                'department'  => $extraData['department'] ?? 'RH',
                'employee_id' => $extraData['employee_id'] ?? 'EMP456',
                'status'      => 'inativo',
                'notes'       => $extraData['notes'] ?? 'Cancelado pelo sistema da Yellow',
            ]
        ];

        $url = $this->getClinicBaseUrl() . '/update-patient/' . $cpf . '/';

        try {
            $response = Http::withHeaders($headers)->patch($url, $payload);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;
            $ret = [
                'exec' => $ok,
                'message' => $ok ? 'Paciente inativado na LSX Medical com sucesso' : ($body['message'] ?? 'Falha ao inativar paciente na LSX Medical'),
                'data' => $body,
                'status' => $status,
                'payload' => $payload
            ];
            if ($ok && isset($extraData['contract_id'])) {
                $contract = Contract::find($extraData['contract_id']);
                if ($contract) {
                    $oldStatus = $contract->status;
                    $contract->update(['status' => 'cancelled']);
                    Qlib::update_contract_meta($contract->id, 'integration_lsx_medical', json_encode($ret));
                    ContractEventLogger::logStatusChange(
                        $contract,
                        $oldStatus,
                        'cancelled',
                        'Contrato cancelado automaticamente via ação LSX Medical.',
                        ['integration_response' => $ret],
                        json_encode($ret),
                        auth()->id()
                    );
                    $ret['contract'] = $contract->refresh();
                }
            }
            return $ret;
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao comunicar com LSX Medical para cancelamento',
                'error' => $e->getMessage(),
            ];
        }
    }
}
