<?php

namespace App\Services;

use App\Http\Controllers\api\ApiCredentialController;
use App\Models\Contract;
use App\Models\User;
use App\Services\ContractEventLogger;
use App\Services\Qlib;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IzaService
{
    protected string $baseUrl = '';
    protected string $authToken = '';
    protected bool $integrationActive = false;

    public function __construct()
    {
        $this->loadCredentialsFromApi('integracao-iza');
        if (!$this->integrationActive) {
            $envUrl = (string) (env('IZA_BASE_URL') ?? '');
            $envToken = (string) (env('IZA_AUTH_TOKEN') ?? '');
            if ($envUrl !== '' && $envToken !== '') {
                $this->baseUrl = rtrim($envUrl, '/');
                $this->authToken = $envToken;
                $this->integrationActive = true;
            }
        }
    }

    /**
     * Carrega credenciais da ApiCredential pelo post_name (slug).
     * pt-BR: Tenta obter URL base e token de autenticação da tabela api_credentials.
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
                    $this->authToken = $pass;
                }
            }
        } catch (\Throwable $e) {
            // keep defaults
        }
    }

    public function isIntegrationActive(): bool
    {
        return $this->integrationActive && $this->baseUrl !== '' && $this->authToken !== '';
    }

    public function getCredentialsResolved(): array
    {
        return [
            'active' => $this->isIntegrationActive(),
            'base_url' => $this->baseUrl,
            'token_set' => $this->authToken !== '',
        ];
    }

    /**
     * Monta o payload para a API da IZA a partir dos dados do cliente e contrato.
     * pt-BR: Extrai doc, name, birthed_at, email, main_cell_phone, social_name,
     *        date_begin, date_end e plan_id.
     *
     * @param User $client
     * @param array $extraData
     * @param Contract|null $contract
     * @return array
     */
    public function buildPayload(User $client, array $extraData = [], ?Contract $contract = null): array
    {
        // Extrair config do cliente
        $config = is_array($client->config) ? $client->config : (json_decode($client->config ?? '[]', true) ?? []);

        // Config do produto vinculado ao contrato
        $productConfig = [];
        if ($contract !== null) {
            $product = $contract->product;
            if ($product !== null) {
                $productConfig = is_array($product->config)
                    ? $product->config
                    : (json_decode($product->config ?? '[]', true) ?? []);
            }
        }

        // CPF/CNPJ limpo
        $doc = preg_replace('/\D/', '', $extraData['doc'] ?? $extraData['cpf'] ?? $client->cpf ?? $client->cnpj ?? '');

        // Nome
        $name = $extraData['name'] ?? $client->name ?? '';

        // Data de nascimento (prioridade: extraData > config do cliente)
        $birthDate = $extraData['birthed_at']
            ?? $extraData['birth_date']
            ?? $config['nascimento']
            ?? $extraData['nascimento']
            ?? null;
        if ($birthDate && strpos($birthDate, '/') !== false) {
            try {
                $birthDate = Qlib::dtBanco($birthDate);
            } catch (\Throwable $th) {
                // fall through
            }
        }

        // E-mail
        $email = $extraData['email'] ?? $client->email ?? '';

        // Telefone
        $phone = preg_replace('/\D/', '', $extraData['main_cell_phone'] ?? $extraData['celular'] ?? $client->celular ?? $extraData['phone'] ?? '');

        // Nome social
        $socialName = $extraData['social_name'] ?? $config['social_name'] ?? $config['nome_social'] ?? '';

        // Datas de vigência (prioridade: extraData > contrato)
        $dateBegin = $extraData['date_begin']
            ?? ($contract && $contract->start_date ? Carbon::parse($contract->start_date)->format('Y-m-d') : null)
            ?? date('Y-m-d');

        $dateEnd = $extraData['date_end']
            ?? ($contract && $contract->end_date ? Carbon::parse($contract->end_date)->format('Y-m-d') : null)
            ?? date('Y-m-d', strtotime('+1 year'));

        // Plan ID (prioridade: extraData > product config > client config > fallback)
        $planId = $extraData['plan_id']
            ?? $extraData['codigo_do_plano']
            ?? $productConfig['plan_id']
            ?? $productConfig['iza_plan_id']
            ?? $productConfig['slug_parceiro']
            ?? $productConfig['codigo_do_plano']
            ?? $config['plan_id']
            ?? $config['iza_plan_id']
            ?? $config['codigo_do_plano']
            ?? '101';

        return [
            'doc' => (string) $doc,
            'name' => (string) $name,
            'birthed_at' => $birthDate,
            'email' => (string) $email,
            'main_cell_phone' => (string) $phone,
            'social_name' => (string) $socialName,
            'date_begin' => (string) $dateBegin,
            'date_end' => (string) $dateEnd,
            'plan_id' => (string) $planId,
        ];
    }

    /**
     * Submete um contrato para a API da IZA.
     * POST /api/integrations/partners/contracts
     *
     * @param User $client
     * @param array $extraData
     * @param Contract|null $contract
     * @return array
     */
    public function submitContract(User $client, array $extraData = [], ?Contract $contract = null): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração IZA inativa'];
        }

        $payload = $this->buildPayload($client, $extraData, $contract);

        // Validar campos obrigatórios mínimos
        if (empty($payload['doc']) || empty($payload['name'])) {
            return ['exec' => false, 'message' => 'Dados incompletos para integração IZA (CPF/CNPJ ou Nome faltando)'];
        }

        if (empty($payload['birthed_at'])) {
            return ['exec' => false, 'message' => 'Data de nascimento obrigatória para integração IZA'];
        }

        $headers = [
            'Authorization' => 'Basic ' . $this->authToken,
            'Content-Type' => 'application/json',
        ];

        $url = rtrim($this->baseUrl, '/') . '/api/integrations/partners/contracts';

        try {
            $response = Http::withHeaders($headers)->post($url, $payload);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;

            $message = $ok
                ? ($body['message'] ?? 'Contrato enviado à IZA com sucesso')
                : ($body['message'] ?? $body['error'] ?? 'Falha ao enviar contrato para a IZA');

            // Gravar meta no contrato
            if ($contract) {
                Qlib::update_contract_meta($contract->id, 'integration_iza', json_encode([
                    'exec' => $ok,
                    'status' => $status,
                    'data' => $body,
                    'payload' => $payload,
                ]));
            }

            return [
                'exec' => $ok,
                'message' => $message,
                'data' => $body,
                'payload' => $payload,
                'status' => $status,
            ];
        } catch (\Throwable $e) {
            return [
                'exec' => false,
                'message' => 'Erro ao comunicar com a IZA',
                'error' => $e->getMessage(),
                'payload' => $payload,
            ];
        }
    }

    /**
     * Cancela um contrato na API da IZA.
     * PATCH /api/integrations/partners/contracts/{iza_contract_id}/cancel
     *
     * @param Contract $contract        Contrato local
     * @param string|null $dateCancelled Data de cancelamento (Y-m-d). Padrão: hoje.
     * @return array
     */
    public function cancelContract(Contract $contract, ?string $dateCancelled = null, $authUserId = null): array
    {
        if (!$this->isIntegrationActive()) {
            return ['exec' => false, 'message' => 'Integração IZA inativa'];
        }

        // Buscar o ID IZA armazenado na meta do contrato
        $izaMeta = Qlib::get_contract_meta($contract->id, 'integration_iza');
        $izaData = [];
        if ($izaMeta) {
            $izaData = is_array($izaMeta) ? $izaMeta : (json_decode($izaMeta, true) ?? []);
        }

        // O ID IZA pode estar em data.id, data.contract_id ou similares
        $izaContractId = $izaData['data']['id']
            ?? $izaData['data']['contract_id']
            ?? $izaData['data']['uuid']
            ?? null;
        if (!$izaContractId) {
            ContractEventLogger::log(
                $contract,
                'integracao_iza_cancel',
                'Cancelamento IZA não executado: ID IZA do contrato não encontrado.',
                ['status' => 'error', 'reason' => 'iza_contract_id_missing'],
                null,
                $authUserId
            );
            return [
                'exec' => false,
                'message' => 'ID do contrato na IZA não encontrado. O contrato foi integrado à IZA?',
            ];
        }

        $dateCancelled = $dateCancelled ?? date('Y-m-d');

        $url = rtrim($this->baseUrl, '/') . '/api/integrations/partners/contracts/' . $izaContractId . '/cancel';
        $payload = ['date_cancelled' => $dateCancelled];

        $headers = [
            'Authorization' => 'Basic ' . $this->authToken,
            'Content-Type' => 'application/json',
        ];

        try {
            $response = Http::withHeaders($headers)->post($url, $payload);
            $status = $response->status();
            $body = $response->json();
            $ok = $status >= 200 && $status < 300;

            $message = $ok
                ? ($body['message'] ?? 'Contrato cancelado na IZA com sucesso')
                : ($body['message'] ?? $body['error'] ?? 'Falha ao cancelar contrato na IZA');

            $logPayload = json_encode([
                'request' => ['url' => $url, 'payload' => $payload],
                'response' => ['status' => $status, 'body' => $body],
            ], JSON_UNESCAPED_UNICODE);

            Qlib::update_contract_meta($contract->id, 'integration_iza_cancel', json_encode([
                'exec' => $ok,
                'status' => $status,
                'iza_contract_id' => $izaContractId,
                'date_cancelled' => $dateCancelled,
                'data' => $body,
            ]));

            // Detecta se a IZA sinalizou que o contrato já está em processo de cancelamento
            $errorText = strtolower($body['error'] ?? $body['message'] ?? '');
            $alreadyCancelling = !$ok && str_contains($errorText, 'cancellation');

            // Trata como sucesso efetivo: API confirmou cancelamento OU contrato já estava sendo cancelado
            $effectiveSuccess = $ok || $alreadyCancelling;

            if ($effectiveSuccess) {
                // Atualizar status local para cancelled
                $oldStatus = $contract->status;
                if ($oldStatus !== 'cancelled') {
                    $contract->update(['status' => 'cancelled']);
                    ContractEventLogger::logStatusChange(
                        $contract,
                        $oldStatus,
                        'cancelled',
                        $alreadyCancelling
                            ? 'Status atualizado para cancelado: IZA indicou que contrato já estava em cancelamento.'
                            : 'Status atualizado para cancelado via integração IZA.',
                        ['iza_contract_id' => $izaContractId, 'date_cancelled' => $dateCancelled],
                        $logPayload,
                        $authUserId
                    );
                }

                ContractEventLogger::log(
                    $contract,
                    'integracao_iza_cancel',
                    $alreadyCancelling
                        ? 'Cancelamento IZA: contrato já estava em processo de cancelamento — status local atualizado.'
                        : 'Cancelamento realizado com sucesso na IZA.',
                    ['status' => 'success', 'iza_contract_id' => $izaContractId, 'date_cancelled' => $dateCancelled, 'already_cancelling' => $alreadyCancelling],
                    $logPayload,
                    $authUserId
                );
            } else {
                ContractEventLogger::log(
                    $contract,
                    'integracao_iza_cancel',
                    'Falha no cancelamento na IZA: ' . $message,
                    ['status' => 'error', 'http_status' => $status, 'iza_contract_id' => $izaContractId],
                    $logPayload,
                    $authUserId
                );
            }

            return [
                'exec' => $effectiveSuccess,
                'message' => $alreadyCancelling
                    ? 'Contrato já estava em cancelamento na IZA. Status local atualizado.'
                    : $message,
                'data' => $body,
                'status' => $status,
                'iza_contract_id' => $izaContractId,
            ];
        } catch (\Throwable $e) {
            ContractEventLogger::log(
                $contract,
                'integracao_iza_cancel',
                'Exceção ao comunicar cancelamento com a IZA: ' . $e->getMessage(),
                ['status' => 'error', 'error' => $e->getMessage()],
                json_encode(['trace' => $e->getTraceAsString()]),
                $authUserId
            );
            return [
                'exec' => false,
                'message' => 'Erro ao comunicar cancelamento com a IZA',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Processa a integração completa: envia contrato para a IZA e atualiza status.
     * pt-BR: Método orquestrador chamado pelo ContractController no store/update.
     *
     * @param Contract $contract
     * @param int|null $authUserId
     * @return array
     */
    public function processIntegration(Contract $contract, $authUserId = null): array
    {
        $ret = ['exec' => false, 'color' => 'danger', 'mens' => ''];

        try {
            if (!$this->isIntegrationActive()) {
                ContractEventLogger::log(
                    $contract,
                    'integracao_iza',
                    'Integração IZA inativa.',
                    ['status' => 'skipped', 'reason' => 'integration_inactive'],
                    null,
                    $authUserId
                );
                $ret['mens'] = 'Integração IZA inativa';
                return $ret;
            }

            $client = $contract->client;

            if (!$client) {
                ContractEventLogger::log(
                    $contract,
                    'integracao_iza',
                    'Integração não executada: titular ausente no contrato.',
                    ['status' => 'skipped', 'reason' => 'holder_missing'],
                    null,
                    $authUserId
                );
                $ret['mens'] = 'Titular ausente no contrato';
                return $ret;
            }

            // Não deve integrar se o titular for Fornecedor
            $permission = $client->permission;
            $permId = $permission ? $permission->id : null;
            $supplierPermission = Qlib::qoption('permission_supplier_id') ?? '6';
            if (!$permId || $permId == $supplierPermission) {
                ContractEventLogger::log(
                    $contract,
                    'integracao_iza',
                    'Integração não executada: titular é Fornecedor.',
                    ['status' => 'skipped', 'reason' => 'holder_not_cliente', 'holder_permission' => $permId],
                    null,
                    $authUserId
                );
                return $ret;
            }

            // Validar dados mínimos
            $documento = str_replace(['.', '-', ' '], '', $client->cpf ?? $client->cnpj ?? '');
            $clientConfig = is_array($client->config) ? $client->config : (json_decode($client->config ?? '[]', true) ?? []);
            $nascimento = $clientConfig['nascimento'] ?? null;

            $missing = [];
            if (empty($documento)) $missing[] = 'CPF/CNPJ';
            if (empty($nascimento)) $missing[] = 'Data de Nascimento';

            if (!empty($missing)) {
                ContractEventLogger::log(
                    $contract,
                    'integracao_iza',
                    'Integração não executada: dados do titular insuficientes.',
                    [
                        'status' => 'skipped',
                        'reason' => 'insufficient_client_data',
                        'missing_fields' => $missing,
                    ],
                    null,
                    $authUserId
                );
                $ret['mens'] = 'Campos insuficientes: ' . implode(', ', $missing);
                return $ret;
            }

            // Submeter contrato
            $response = $this->submitContract($client, [], $contract);

            $fullLogPayload = json_encode([
                'request' => $response['payload'] ?? [],
                'response' => $response,
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

            Qlib::update_contract_meta($contract->id, 'ultimo_envio_fornecedor', json_encode($response));

            if (isset($response['exec']) && $response['exec'] === true) {
                $oldStatus = $contract->status;
                $contract->update(['status' => 'approved']);
                Qlib::update_contract_meta($contract->id, 'envio_fornecedor_sucesso', json_encode($response));

                ContractEventLogger::log(
                    $contract,
                    'integracao_iza',
                    'Integração IZA realizada com sucesso.',
                    ['status' => 'success'],
                    $fullLogPayload,
                    $authUserId
                );

                ContractEventLogger::logStatusChange(
                    $contract,
                    $oldStatus,
                    'approved',
                    'Status atualizado para aprovado via integração IZA.',
                    [],
                    $fullLogPayload,
                    $authUserId
                );

                $ret = [
                    'exec' => true,
                    'color' => 'success',
                    'mens' => 'Integração IZA realizada com sucesso.',
                    'data' => $contract->refresh(),
                ];
            } else {
                $errorMsg = $response['message'] ?? 'Erro desconhecido na integração IZA';
                ContractEventLogger::log(
                    $contract,
                    'integracao_iza',
                    'Falha na integração IZA: ' . $errorMsg,
                    ['status' => 'error'],
                    $fullLogPayload,
                    $authUserId
                );

                $ret['mens'] = $errorMsg;
            }
        } catch (\Exception $e) {
            Log::error('Erro na automação IZA: ' . $e->getMessage());
            $ret['exec'] = false;
            $ret['mens'] = $e->getMessage();
        }

        return $ret;
    }
}
