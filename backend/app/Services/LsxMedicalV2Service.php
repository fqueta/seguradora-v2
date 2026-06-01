<?php

namespace App\Services;

use App\Http\Controllers\api\ApiCredentialController;
use Illuminate\Support\Facades\Http;
use App\Models\User;
use App\Models\Contract;
use App\Services\ContractEventLogger;

class LsxMedicalV2Service
{
    protected string $baseUrl = '';
    protected string $token = '';
    protected bool $integrationActive = false;
    protected array $meta = [];

    public function __construct()
    {
        $this->loadCredentialsFromApi('integracao-lsx-medical-v2');
        if (!$this->integrationActive) {
            $envUrl = (string) (env('LSX_MEDICAL_V2_BASE_URL') ?? '');
            $envToken = (string) (env('LSX_MEDICAL_V2_TOKEN') ?? '');
            if ($envUrl !== '' && $envToken !== '') {
                $this->baseUrl = rtrim($envUrl, '/');
                $this->token = $envToken;
                $this->integrationActive = true;
            }
        }
    }

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

                if (isset($cred['meta']) && is_array($cred['meta'])) {
                    foreach ($cred['meta'] as $metaItem) {
                        if (isset($metaItem['key'])) {
                            $this->meta[$metaItem['key']] = $metaItem['value'] ?? '';
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
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

    private function getResolvedUrl(string $path): string
    {
        $base = rtrim($this->baseUrl, '/');
        $base = preg_replace('#/api/clinic$#i', '', $base);
        $base = preg_replace('#/clinic$#i', '', $base);
        $base = preg_replace('#/clinic/patient$#i', '', $base);
        $base = preg_replace('#/clinic/patients$#i', '', $base);
        $base = preg_replace('#/clinic/patients/paginated$#i', '', $base);
        $base = preg_replace('#/api$#i', '', $base);
        return rtrim($base, '/') . '/' . ltrim($path, '/');
    }

    private function getClinicBaseUrl(): string
    {
        return $this->getResolvedUrl('/clinic');
    }

    public function buildPayload(User $client, array $extraData = [], ?Contract $contract = null): array
    {
        $name = $extraData['name'] ?? $client->name;
        $cpf = preg_replace('/\D/', '', $extraData['cpf'] ?? $client->cpf);
        $email = $extraData['email'] ?? $client->email;
        $phone = preg_replace('/\D/', '', $extraData['celular'] ?? $client->celular ?? $extraData['phone'] ?? '');

        $config = is_array($client->config) ? $client->config : (json_decode($client->config ?? '[]', true) ?? []);

        $productConfig = [];
        if ($contract === null && isset($extraData['contract']) && $extraData['contract'] instanceof Contract) {
            $contract = $extraData['contract'];
        }
        if ($contract !== null) {
            $product = $contract->product;
            if ($product !== null) {
                $productConfig = is_array($product->config)
                    ? $product->config
                    : (json_decode($product->config ?? '[]', true) ?? []);
            }
        }

        $birthDate = $extraData['birth_date'] ?? $extraData['birthDate'] ?? $config['nascimento'] ?? $extraData['nascimento'] ?? null;
        if ($birthDate) {
            if (strpos($birthDate, '/') !== false) {
                try {
                    $birthDate = \App\Services\Qlib::dtBanco($birthDate);
                } catch (\Throwable $th) {
                }
            }
        }

        $beneficiaryPlanCode =
            $extraData['beneficiary_plan_code']
            ?? $extraData['codigo_do_plano']
            ?? $extraData['insurance_plan_code']
            ?? $extraData['slug_parceiro']
            ?? $extraData['id_parceiro']
            ?? $productConfig['beneficiary_plan_code']
            ?? $productConfig['codigo_do_plano']
            ?? $productConfig['insurance_plan_code']
            ?? $productConfig['slug_parceiro']
            ?? $productConfig['id_parceiro']
            ?? $config['beneficiary_plan_code']
            ?? $config['codigo_do_plano']
            ?? $config['insurance_plan_code']
            ?? $config['slug_parceiro']
            ?? $config['id_parceiro']
            ?? 'PLAN0001';

        $genderRaw = $extraData['gender'] ?? $config['genero'] ?? $extraData['genero'] ?? $client->gender ?? $client->sexo ?? null;
        $gender = 'male';
        if ($genderRaw) {
            $gLower = mb_strtolower($genderRaw);
            if (in_array($gLower, ['m', 'masculino', 'male', 'homem'])) {
                $gender = 'male';
            } elseif (in_array($gLower, ['f', 'feminino', 'female', 'mulher'])) {
                $gender = 'female';
            } elseif (in_array($gLower, ['o', 'outro', 'other'])) {
                $gender = 'other';
            }
        }

        $tipo = strtoupper($extraData['extra_fields']['tipo'] ?? $config['lsx_extra_fields']['tipo'] ?? $extraData['tipo'] ?? 'TITULAR');
        $isDependent = ($tipo === 'DEPENDENTE');
        if (isset($extraData['isDependent'])) {
            $isDependent = filter_var($extraData['isDependent'], FILTER_VALIDATE_BOOLEAN);
        } elseif (isset($extraData['is_dependent'])) {
            $isDependent = filter_var($extraData['is_dependent'], FILTER_VALIDATE_BOOLEAN);
        }

        $holderId = $extraData['holder_id'] ?? $extraData['holderId'] ?? $config['holder_id'] ?? $config['holderId'] ?? $this->meta['holder_id'] ?? $this->meta['holderId'] ?? null;
        $holderCpf = preg_replace('/\D/', '', $extraData['holder_cpf'] ?? $extraData['holderCpf'] ?? $config['holder_cpf'] ?? $config['holderCpf'] ?? $this->meta['holder_cpf'] ?? $this->meta['holderCpf'] ?? '') ?: null;

        $clinicId = $extraData['clinic_id'] ?? $extraData['clinicId'] ?? $productConfig['clinic_id'] ?? $productConfig['clinicId'] ?? $config['clinic_id'] ?? $config['clinicId'] ?? $this->meta['clinic_id'] ?? $this->meta['clinicId'] ?? null;
        $clinicIds = $extraData['clinic_ids'] ?? $extraData['clinicIds'] ?? $productConfig['clinic_ids'] ?? $productConfig['clinicIds'] ?? $config['clinic_ids'] ?? $config['clinicIds'] ?? $this->meta['clinic_ids'] ?? $this->meta['clinicIds'] ?? null;
        if (is_string($clinicIds)) {
            $clinicIds = array_filter(array_map('trim', explode(',', $clinicIds)));
        }
        if (empty($clinicIds) && !empty($clinicId)) {
            $clinicIds = [$clinicId];
        }

        $companyId = $extraData['company_id'] ?? $extraData['companyId'] ?? $productConfig['company_id'] ?? $productConfig['companyId'] ?? $config['company_id'] ?? $config['companyId'] ?? $this->meta['company_id'] ?? $this->meta['companyId'] ?? null;
        $tagIds = $extraData['tag_ids'] ?? $extraData['tagIds'] ?? $productConfig['tag_ids'] ?? $productConfig['tagIds'] ?? $config['tag_ids'] ?? $config['tagIds'] ?? $this->meta['tag_ids'] ?? $this->meta['tagIds'] ?? [];
        if (is_string($tagIds)) {
            $tagIds = array_filter(array_map('trim', explode(',', $tagIds)));
        }

        $planId = $extraData['plan_id'] ?? $extraData['planId'] ?? $productConfig['plan_id'] ?? $productConfig['planId'] ?? $config['plan_id'] ?? $config['planId'] ?? $this->meta['plan_id'] ?? $this->meta['planId'] ?? $beneficiaryPlanCode ?? null;

        $clinicPlans = $extraData['clinic_plans'] ?? $extraData['clinicPlans'] ?? $productConfig['clinic_plans'] ?? $productConfig['clinicPlans'] ?? $config['clinic_plans'] ?? $config['clinicPlans'] ?? $this->meta['clinic_plans'] ?? $this->meta['clinicPlans'] ?? null;
        if (empty($clinicPlans) && !empty($clinicId) && !empty($planId)) {
            $clinicPlans = [
                [
                    'clinicId' => (string)$clinicId,
                    'planId' => (string)$planId
                ]
            ];
        }

        return [
            'name' => (string)$name,
            'cpf' => (string)$cpf,
            'email' => (string)$email,
            'phone' => (string)$phone,
            'birthDate' => $birthDate,
            'gender' => $gender,
            'isDependent' => $isDependent,
            'holderId' => $holderId,
            'holderCpf' => $holderCpf,
            'clinicId' => $clinicId,
            'clinicIds' => $clinicIds,
            'companyId' => $companyId,
            'tagIds' => $tagIds,
            'planId' => $planId,
            'clinicPlans' => $clinicPlans,
            'address' => [
                'zipCode' => $extraData['zip_code'] ?? $extraData['zipCode'] ?? $config['cep'] ?? $extraData['cep'] ?? null,
                'street' => $extraData['street'] ?? $extraData['street'] ?? $config['endereco'] ?? $extraData['endereco'] ?? null,
                'number' => $extraData['number'] ?? $extraData['number'] ?? $config['numero'] ?? $config['numero'] ?? null,
                'complement' => $extraData['complement'] ?? $extraData['complemento'] ?? $config['complemento'] ?? null,
                'neighborhood' => $extraData['neighborhood'] ?? $extraData['neighborhood'] ?? $config['bairro'] ?? $extraData['bairro'] ?? null,
                'city' => $extraData['city'] ?? $extraData['city'] ?? $config['cidade'] ?? $extraData['cidade'] ?? null,
                'state' => $extraData['state'] ?? $extraData['state'] ?? $config['uf'] ?? $extraData['uf'] ?? null,
            ],
        ];
    }

    public function findPatientIdByCpf(string $cpf, ?User $client = null): ?string
    {
        if (!$this->isIntegrationActive()) {
            return null;
        }

        $cpfOnly = preg_replace('/\D/', '', $cpf);
        if (empty($cpfOnly)) {
            return null;
        }

        if ($client && $client->exists) {
            $config = is_array($client->config) ? $client->config : (json_decode($client->config ?? '[]', true) ?? []);
            if (!empty($config['lsx_medical_v2_patient_id'])) {
                return (string)$config['lsx_medical_v2_patient_id'];
            }
        }

        $headers = [
            'x-api-key' => $this->token,
            'Content-Type' => 'application/json',
        ];
        $url = $this->getResolvedUrl('/clinic/patients/paginated');

        try {
            $response = Http::withHeaders($headers)->get($url, ['cpf' => $cpfOnly]);
            if ($response->successful()) {
                $body = $response->json();
                $results = $body['results'] ?? $body['data'] ?? $body ?? [];
                if (is_array($results)) {
                    $first = $results[0] ?? $results['results'][0] ?? null;
                    if ($first && isset($first['id'])) {
                        $patientId = (string)$first['id'];
                        if ($client && $client->exists) {
                            $config = is_array($client->config) ? $client->config : (json_decode($client->config ?? '[]', true) ?? []);
                            $config['lsx_medical_v2_patient_id'] = $patientId;
                            $client->update(['config' => $config]);
                        }
                        return $patientId;
                    }
                }
            }
        } catch (\Throwable $e) {
        }

        return null;
    }

    public function createPatient(User $client, array $extraData = [], ?Contract $contract = null): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração LSX Medical V2 inativa'];
        }

        if (isset($extraData['clinic_patient_payload']) && is_array($extraData['clinic_patient_payload'])) {
            return $this->createClinicPatient($extraData['clinic_patient_payload'], $client, $contract);
        }

        $looksLikeClinicPatientRequest =
            (isset($extraData['name']) || isset($extraData['cpf']) || isset($extraData['email']))
            && (isset($extraData['clinicPlans']) || isset($extraData['clinic_plans']) || isset($extraData['clinicId']) || isset($extraData['clinic_id']))
            && (isset($extraData['planId']) || isset($extraData['plan_id']) || isset($extraData['birthDate']) || isset($extraData['birth_date']));
        if ($looksLikeClinicPatientRequest) {
            return $this->createClinicPatient($extraData, $client, $contract);
        }

        $payload = $this->buildPayload($client, $extraData, $contract);
        if (empty($payload['cpf']) || empty($payload['name'])) {
            return ['exec' => false, 'message' => 'Dados incompletos para integração (CPF ou Nome faltando)'];
        }

        $headers = [
            'x-api-key' => $this->token,
            'Content-Type' => 'application/json',
        ];
        $url = $this->getResolvedUrl('/clinic/patient');

        try {
            $response = Http::withHeaders($headers)->post($url, $payload);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;
            $completMensage = $ok ? ($body['message'] ?? 'Paciente criado na LSX Medical V2 com sucesso') : ($body['error'] ?? $body['data']['error'] ?? 'Falha ao criar paciente na LSX Medical V2');

            $salv = Qlib::update_contract_meta($client->id, 'lsx_medical_v2_create_patient', $body);

            if ($ok) {
                $patientId = $body['id'] ?? $body['patient']['id'] ?? $body['data']['id'] ?? null;
                if ($patientId && $client && $client->exists) {
                    $config = is_array($client->config) ? $client->config : (json_decode($client->config ?? '[]', true) ?? []);
                    $config['lsx_medical_v2_patient_id'] = $patientId;
                    $client->update(['config' => $config]);
                }
            }

            return [
                'exec' => $ok,
                'message' => $completMensage,
                'data' => $body,
                'payload' => $payload,
                'status' => $status,
                'save' => $salv,
            ];
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao comunicar com LSX Medical V2',
                'error' => $e->getMessage(),
                'payload' => $payload,
            ];
        }
    }

    private function normalizeClinicPatientPayload(array $payload): array
    {
        $cpf = preg_replace('/\D/', '', (string)($payload['cpf'] ?? ''));
        $name = (string)($payload['name'] ?? '');
        $email = (string)($payload['email'] ?? '');
        $birthDate = $payload['birthDate'] ?? $payload['birth_date'] ?? null;
        if (is_string($birthDate) && strpos($birthDate, '/') !== false) {
            try {
                $birthDate = \App\Services\Qlib::dtBanco($birthDate);
            } catch (\Throwable $th) {
            }
        }

        $genderRaw = $payload['gender'] ?? null;
        $gender = null;
        if (is_string($genderRaw) && $genderRaw !== '') {
            $gender = mb_strtolower($genderRaw);
        }

        $isDependent = null;
        if (array_key_exists('isDependent', $payload)) {
            $isDependent = filter_var($payload['isDependent'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        } elseif (array_key_exists('is_dependent', $payload)) {
            $isDependent = filter_var($payload['is_dependent'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        }

        $clinicId = $payload['clinicId'] ?? $payload['clinic_id'] ?? null;
        $companyId = $payload['companyId'] ?? $payload['company_id'] ?? null;
        $planId = $payload['planId'] ?? $payload['plan_id'] ?? null;
        $clinicPlans = $payload['clinicPlans'] ?? $payload['clinic_plans'] ?? null;

        if (empty($clinicPlans) && !empty($clinicId) && !empty($planId)) {
            $clinicPlans = [
                [
                    'clinicId' => (string)$clinicId,
                    'planId' => (string)$planId,
                ]
            ];
        }

        $normalized = [
            'name' => $name,
            'cpf' => $cpf,
            'email' => $email,
            'birthDate' => $birthDate,
            'gender' => $gender,
            'isDependent' => $isDependent,
            'clinicId' => $clinicId,
            'companyId' => $companyId,
            'planId' => $planId,
            'clinicPlans' => $clinicPlans,
        ];

        foreach ($normalized as $k => $v) {
            if ($v === null) {
                unset($normalized[$k]);
            }
        }

        return $normalized;
    }

    public function createClinicPatient(array $payload, ?User $client = null, ?Contract $contract = null): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração LSX Medical V2 inativa'];
        }

        $normalizedPayload = $this->normalizeClinicPatientPayload($payload);

        if (empty($normalizedPayload['cpf']) || empty($normalizedPayload['name']) || empty($normalizedPayload['email'])) {
            return ['exec' => false, 'message' => 'Dados incompletos para criar paciente (name/cpf/email)'];
        }

        $headers = [
            'x-api-key' => $this->token,
            'Content-Type' => 'application/json',
        ];
        $url = $this->getResolvedUrl('/clinic/patient');

        try {
            $response = Http::withHeaders($headers)->post($url, $normalizedPayload);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;
            $completMensage = $ok ? ($body['message'] ?? 'Paciente criado na LSX Medical V2 com sucesso') : ($body['error'] ?? $body['data']['error'] ?? ($body['message'] ?? 'Falha ao criar paciente na LSX Medical V2'));

            if ($ok) {
                $patientId = $body['id'] ?? $body['patient']['id'] ?? $body['data']['id'] ?? null;
                if ($patientId && $client && $client->exists) {
                    $config = is_array($client->config) ? $client->config : (json_decode($client->config ?? '[]', true) ?? []);
                    $config['lsx_medical_v2_patient_id'] = $patientId;
                    $client->update(['config' => $config]);
                }
            }

            return [
                'exec' => $ok,
                'message' => $completMensage,
                'data' => $body,
                'payload' => $normalizedPayload,
                'status' => $status,
            ];
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao comunicar com LSX Medical V2',
                'error' => $e->getMessage(),
                'payload' => $normalizedPayload,
            ];
        }
    }

    public function updatePatient(User $client, array $extraData = [], ?Contract $contract = null): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração LSX Medical V2 inativa'];
        }

        $payload = $this->buildPayload($client, $extraData, $contract);
        if (empty($payload['cpf'])) {
            return ['exec' => false, 'message' => 'CPF obrigatório para atualização'];
        }

        $patientId = $this->findPatientIdByCpf($payload['cpf'], $client);
        if (!$patientId) {
            return ['exec' => false, 'message' => 'Paciente não encontrado na LSX Medical V2 para atualização'];
        }

        $headers = [
            'x-api-key' => $this->token,
            'Content-Type' => 'application/json',
        ];
        $url = $this->getResolvedUrl("/clinic/patients/{$patientId}");

        try {
            $response = Http::withHeaders($headers)->patch($url, $payload);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;
            return [
                'exec' => $ok,
                'message' => $ok ? 'Paciente atualizado na LSX Medical V2 com sucesso' : ($body['message'] ?? 'Falha ao atualizar paciente na LSX Medical V2'),
                'data' => $body,
                'status' => $status,
            ];
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao comunicar com LSX Medical V2',
                'error' => $e->getMessage(),
            ];
        }
    }

    public function filterPatientsByCpf(string $cpf, $contractId = null): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração LSX Medical V2 inativa'];
        }
        $cpfOnly = preg_replace('/\D/', '', $cpf);
        if (empty($cpfOnly)) {
            return ['exec' => false, 'message' => 'CPF inválido para consulta'];
        }

        $headers = [
            'x-api-key' => $this->token,
            'Content-Type' => 'application/json',
        ];
        $url = $this->getResolvedUrl('/clinic/patients/paginated');
        try {
            $response = Http::withHeaders($headers)->get($url, ['cpf' => $cpfOnly]);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;

            $results = $body['results'] ?? $body['data'] ?? $body ?? [];
            $resultsFormatted = [];
            if (is_array($results)) {
                $resultsFormatted = $results;
            } else {
                $resultsFormatted = [$results];
            }

            $normalizedData = [
                'results' => $resultsFormatted
            ];

            $ret =  [
                'exec' => $ok,
                'message' => $ok ? 'Consulta realizada com sucesso' : ($body['message'] ?? 'Falha na consulta'),
                'data' => $normalizedData,
                'status' => $status,
            ];
            Qlib::update_contract_meta($contractId, 'integration_lsx_medical_v2', json_encode($ret));
            return $ret;
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao consultar pacientes na LSX Medical V2',
                'error' => $e->getMessage(),
            ];
        }
    }

    public function toggleStatus($cpf, $extraData = []): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração LSX Medical V2 inativa'];
        }

        $cpfOnly = preg_replace('/\D/', '', $cpf);
        if (empty($cpfOnly)) {
            return ['exec' => false, 'message' => 'CPF obrigatório'];
        }

        $active = isset($extraData['status']) ? (bool)$extraData['status'] : false;

        $client = User::where('cpf', $cpf)->first();
        if (!$client) {
            $client = User::whereRaw("regexp_replace(cpf, '[^0-9]', '') = ?", [$cpfOnly])->first();
        }

        $patientId = $this->findPatientIdByCpf($cpf, $client);
        if (!$patientId) {
            return ['exec' => false, 'message' => 'Paciente não encontrado na LSX Medical V2'];
        }

        $headers = [
            'x-api-key' => $this->token,
            'Content-Type' => 'application/json',
        ];

        $payload = [
            'active' => $active
        ];

        $url = $this->getResolvedUrl("/clinic/patients/{$patientId}/toggle-active");

        try {
            $response = Http::withHeaders($headers)->patch($url, $payload);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;

            $targetStatus = $active ? 'ACTIVE' : 'INACTIVE';
            $statusLsx = strtoupper($body['patient']['status'] ?? $body['status'] ?? ($active ? 'ACTIVE' : 'INACTIVE'));
            $confirmStatus = ($statusLsx === $targetStatus || $statusLsx === 'ACTIVE' || $statusLsx === 'INACTIVE');

            $ret = [
                'exec' => $ok,
                'message' => $ok ? ($active ? 'Paciente ativado com sucesso' : 'Paciente inativado com sucesso') : ($body['message'] ?? 'Falha na operação'),
                'data' => $body,
                'status' => $status,
                'payload' => $payload,
                'confirm_status' => $confirmStatus
            ];

            $contractId = $extraData['contract_id'] ?? null;
            Qlib::update_contract_meta($contractId, 'integration_lsx_medical_v2', json_encode($ret));

            if ($ok && $contractId) {
                $contract = Contract::find($contractId);
                if ($contract) {
                    $oldStatus = $contract->status;

                    if ($statusLsx === 'INACTIVE' && $oldStatus !== 'cancelled') {
                        $contract->update(['status' => 'cancelled']);
                    } elseif ($statusLsx === 'ACTIVE' && $oldStatus !== 'approved') {
                        $contract->update(['status' => 'approved']);
                    }

                    if ($oldStatus !== $contract->status) {
                        ContractEventLogger::logStatusChange(
                            $contract,
                            $oldStatus,
                            $contract->status,
                            'Contrato ' . ($statusLsx === 'ACTIVE' ? 'aprovado' : 'cancelado') . ' automaticamente via ação LSX Medical V2.',
                            ['integration_response' => $ret],
                            json_encode($ret),
                            auth()->id()
                        );
                    } else {
                        ContractEventLogger::log(
                            $contract,
                            'integracao_lsx_medical_v2',
                            'Status do paciente atualizado na LSX Medical V2 para: ' . $statusLsx,
                            ['integration_response' => $ret],
                            json_encode($ret),
                            auth()->id()
                        );
                    }
                    $ret['contract'] = $contract->refresh();
                }
            } else {
                if (isset($ret['status']) && $ret['status'] == 404) {
                    $ret['message'] = 'Paciente não encontrado na LSX Medical V2';
                } elseif (isset($ret['status']) && $ret['status'] == 400) {
                    $message = $ret['data']['error'] ?? 'Paciente já inativado/ativado na LSX Medical V2';
                    $ret['message'] = $message;
                } else {
                    $ret['message'] = $ret['data']['error'] ?? 'Contrato não encontrado';
                }
            }
            return $ret;
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao comunicar com LSX Medical V2',
                'error' => $e->getMessage(),
            ];
        }
    }
}

