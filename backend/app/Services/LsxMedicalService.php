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
        $beneficiaryPlanCode = $extraData['beneficiary_plan_code'] ?? $config['beneficiary_plan_code'] ?? $extraData['codigo_do_plano'] ?? $config['codigo_do_plano'] ?? $extraData['insurance_plan_code'] ?? $config['insurance_plan_code'] ?? 'PLAN0001';
        $planAdherenceDate = $extraData['plan_adherence_date'] ?? $config['plan_adherence_date'] ?? $extraData['data_de_inicio_do_plano'] ?? $config['data_de_inicio_do_plano'] ?? date('Y-m-d');
        $planExpiryDate = $extraData['plan_expiry_date'] ?? $config['plan_expiry_date'] ?? $extraData['data_de_expiracao'] ?? $config['data_de_expiracao'] ?? date('Y-m-d', strtotime('+1 year'));
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
        $tags = $extraData['tags'] ?? $config['tags'] ?? $extraData['tags'] ?? [];

        return [
            'name' => (string)$name,
            'cpf' => (string)$cpf,
            'email' => (string)$email,
            'birth_date' => $birthDate, // API expects Y-m-d usually
            'phone' => (string)$phone,
            'gender' => $gender,
            'beneficiary_plan_code' => (string)$beneficiaryPlanCode,
            'plan_adherence_date' => $planAdherenceDate,
            'plan_expiry_date' => $planExpiryDate,
            'extra_fields' => $extraFields,
            'tags' => $tags,
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
            $ok = $status >= 200 && $status < 300;
            $completMensage = $ok ? ($body['message'] ?? 'Paciente criado na LSX Medical com sucesso') : ($body['error'] ?? $body['data']['error'] ?? 'Falha ao criar paciente na LSX Medical');
            //gravar um metacampo da requisição
            $salv = Qlib::update_contract_meta($client->id, 'lsx_medical_create_patient', $body);
            $ret = [
                'exec' => $ok,
                'message' => $completMensage,
                'data' => $body,
                'payload' => $payload, // Incluindo payload para log
                'status' => $status,
                'save' => $salv,
            ];
            return $ret;
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
        // $cpfSanitized = preg_replace('/\D/', '', $payload['cpf']);
        $url = $this->getClinicBaseUrl() . '/update-patient/';
        // dd($url,$payload);
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
    public function filterPatientsByCpf(string $cpf, $contractId = null): array
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
            $ret =  [
                'exec' => $ok,
                'message' => $ok ? 'Consulta realizada com sucesso' : ($body['message'] ?? 'Falha na consulta'),
                'data' => $body,
                'status' => $status,
            ];
            Qlib::update_contract_meta($contractId, 'integration_lsx_medical', json_encode($ret));
            return $ret;
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
     * Altera o status do paciente na LSX Medical pelo CPF usando toggle-patient-status.
     * $extraData['status'] pode ser true (para ativar) ou false (para inativar).
     */
    public function toggleStatus($cpf, $extraData = []): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração LSX Medical inativa'];
        }

        $cpf = preg_replace('/\D/', '', $cpf);
        if (empty($cpf)) {
             return ['exec' => false, 'message' => 'CPF obrigatório'];
        }

        $active = isset($extraData['status']) ? (bool)$extraData['status'] : false;

        $headers = [
            'Authorization' => 'Bearer ' . $this->token,
            'Content-Type' => 'application/json',
        ];

        // Payload novo conforme solicitado pelo usuário
        $payload = [
            'cpf'    => $cpf,
            'active' => $active
        ];

        $url = $this->getClinicBaseUrl() . '/toggle-patient-status/';

        try {
            $response = Http::withHeaders($headers)->post($url, $payload);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;

            // Condição solicitada: status retornado pela API
            $targetStatus = $active ? 'ACTIVE' : 'INACTIVE';
            $confirmStatus = (isset($body['patient']['status']) && $body['patient']['status'] === $targetStatus);
            $ret = [
                'exec' => $ok,
                'message' => $ok ? ($active ? 'Paciente ativado com sucesso' : 'Paciente inativado com sucesso') : ($body['message'] ?? 'Falha na operação'),
                'data' => $body,
                'status' => $status,
                'payload' => $payload,
                'confirm_status' => $confirmStatus
            ];
            $contractId = $extraData['contract_id'] ?? null;
            Qlib::update_contract_meta($contractId, 'integration_lsx_medical', json_encode($ret));
            // Se a operação foi bem sucedida e temos um ID de contrato, atualizamos o meta e o status se necessário
            if ($ok && $contractId) {
                $contract = Contract::find($contractId);
                if ($contract) {
                    $oldStatus = $contract->status;
                    $statusLsx = $body['patient']['status'] ?? ($active ? 'ACTIVE' : 'INACTIVE');
                    
                    if ($statusLsx === 'INACTIVE' && $oldStatus !== 'cancelled') {
                        $contract->update(['status' => 'cancelled']);
                    } elseif ($statusLsx === 'ACTIVE' && $oldStatus !== 'approved') {
                        $contract->update(['status' => 'approved']);
                    }
                    // dd($body,$ret);
           
                    // Sempre atualiza o meta quando a operação LSX tem sucesso

                    if ($oldStatus !== $contract->status) {
                        ContractEventLogger::logStatusChange(
                            $contract,
                            $oldStatus,
                            $contract->status,
                            'Contrato ' . ($statusLsx === 'ACTIVE' ? 'aprovado' : 'cancelado') . ' automaticamente via ação LSX Medical.',
                            ['integration_response' => $ret],
                            json_encode($ret),
                            auth()->id()
                        );
                    } else {
                        // Se o status não mudou, registra apenas o evento de integração
                        ContractEventLogger::log(
                            $contract,
                            'integracao_lsx_medical',
                            'Status do paciente atualizado na LSX Medical para: ' . $statusLsx,
                            ['integration_response' => $ret],
                            json_encode($ret),
                            auth()->id()
                        );
                    }
                    $ret['contract'] = $contract->refresh();
                }
            }else{
                if(isset($ret['status']) && $ret['status'] == 404){
                    $ret['message'] = 'Paciente não encontrado na LSX Medical';
                }elseif(isset($ret['status']) && $ret['status'] == 400){
                    $message = $ret['data']['error'] ?? 'Paciente já inativado na LSX Medical';
                    $ret['message'] = $message;
                }else{
                    $ret['message'] = $ret['data']['error'] ?? 'Contrato não encontrado';
                }
            }
            return $ret;
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao comunicar com LSX Medical',
                'error' => $e->getMessage(),
            ];
        }
    }
}
