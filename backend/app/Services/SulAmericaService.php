<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\Client;
use App\Http\Controllers\api\SulAmericaController;
use App\Services\Qlib;
use App\Services\ContractEventLogger;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SulAmericaService
{
    /**
     * Processa a integração com a SulAmérica.
     * 
     * @param Contract $contract
     * @param int|null $authUserId
     * @return array
     */
    public function processIntegration(Contract $contract, $authUserId = null): array
    {
        $ret = ['exec' => false, 'color' => 'danger', 'mens' => ''];
        
        try {
            $product_id = $contract->product_id;
            $supplier = Qlib::getSupplier($product_id);

            if ($supplier && (stripos($supplier, 'SulAmerica') !== false)) {
                $client = $contract->client;

                if ($client) {
                    // Não deve integrar se o titular for Fornecedor
                    $permission = $client->permission;
                    $permId = $permission ? $permission->id : null;
                    $supplierPermission = Qlib::qoption('permission_supplier_id') ?? '6';
                    
                    if (!$permId || $permId == $supplierPermission) {
                        ContractEventLogger::log(
                            $contract,
                            'integracao_sulamerica',
                            'Integração não executada: titular é Fornecedor.',
                            [
                                'status' => 'skipped',
                                'reason' => 'holder_not_cliente',
                                'holder_permission' => $permId,
                            ],
                            null,
                            $authUserId
                        );
                        return $ret;
                    }

                    // Tenta obter dados do cliente
                    $configVal = $client->config;
                    $clientConfig = is_array($configVal) ? $configVal : [];
                    if (empty($clientConfig) && is_string($configVal)) {
                        $decoded = json_decode($configVal, true);
                        if (is_array($decoded)) {
                            $clientConfig = $decoded;
                        }
                    }
                    
                    // Mapeamento de Gênero
                    $sexo = strtoupper($client->genero ?? 'M');
                    if ($sexo == 'NI') $sexo = 'M';
                    
                    // Data Nascimento
                    $nascimento = $clientConfig['nascimento'] ?? null;
                    $product = Qlib::getProductById($contract->product_id);
                    
                    // Validação mínima
                    $documento = str_replace(['.', '-', ' '], '', $client->cpf ?? $client->cnpj ?? '');
                    $missing = [];
                    if (empty($documento)) $missing[] = 'C.P.F';
                    if (empty($nascimento)) $missing[] = 'data Nascimento';
                    
                    if (!empty($missing)) {
                        ContractEventLogger::log(
                            $contract,
                            'integracao_sulamerica',
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

                    // Preparar config para API
                    $apiConfig = [
                        'token_contrato' => $contract->token,
                        'nomeSegurado' => $client->name,
                        'dataNascimento' => $nascimento,
                        'inicioVigencia' => $contract->start_date ? Carbon::parse($contract->start_date)->format('Y-m-d') : null,
                        'fimVigencia' => $contract->end_date ? Carbon::parse($contract->end_date)->format('Y-m-d') : null,
                        'sexo' => $sexo,
                        'uf' => isset($contract->address['state']) ? $contract->address['state'] : ($clientConfig['uf'] ?? ($clientConfig['state'] ?? 'SP')),
                        'documento' => $documento,
                        'planoProduto' => (string)($product['plan'] ?? '1'),
                        'operacaoParceiro' => $contract->token ?? null,
                        'premioSeguro' => $product['costPrice'] ?? null,
                    ];

                    $saController = new SulAmericaController();
                    $response = $saController->contratacao($apiConfig);

                    $response_json = is_array($response) ? json_encode($response) : $response;
                    Qlib::update_contract_meta($contract->id, 'ultimo_envio_fornecedor', $response_json);

                    $fullLogPayload = json_encode([
                        'request' => $apiConfig,
                        'response' => $response
                    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

                    if (isset($response['exec']) && $response['exec'] === true) {
                        $oldStatus = $contract->status;
                        $contract->update(['status' => 'approved']);
                        Qlib::update_contract_meta($contract->id, 'envio_fornecedor_sucesso', $response_json);
                        
                        $contract_number = $response['data']['apolice']['numApolice'] ?? null;
                        if ($contract_number) {
                            $contract->update(['contract_number' => $contract_number]);
                        }
                        
                        $c_number = $response['data']['numCertificado'] ?? null;
                        if ($c_number) {
                            $contract->update(['c_number' => $c_number]);
                        }

                        ContractEventLogger::log(
                            $contract,
                            'integracao_sulamerica',
                            'Integração SulAmérica realizada com sucesso.',
                            ['status' => 'success'],
                            $fullLogPayload,
                            $authUserId
                        );
                        
                        ContractEventLogger::logStatusChange(
                            $contract,
                            $oldStatus,
                            'approved',
                            'Status atualizado para aprovado via integração.',
                            [],
                            $fullLogPayload,
                            $authUserId
                        );
                    } else {
                        $errorMsg = $response['mens'] ?? 'Erro desconhecido na integração';
                        ContractEventLogger::log(
                            $contract,
                            'integracao_sulamerica',
                            'Falha na integração SulAmérica: ' . $errorMsg,
                            ['status' => 'error'],
                            $fullLogPayload,
                            $authUserId
                        );
                    }
                    $ret = $response;
                } else {
                    ContractEventLogger::log(
                        $contract,
                        'integracao_sulamerica',
                        'Integração não executada: titular ausente no contrato.',
                        [
                            'status' => 'skipped',
                            'reason' => 'holder_missing',
                        ],
                        null,
                        $authUserId
                    );
                }
            }
        } catch (\Exception $e) {
            Log::error('Erro na automação SulAmerica: ' . $e->getMessage());
            $ret['exec'] = false;
            $ret['mens'] = $e->getMessage();
        }

        return $ret;
    }
}
