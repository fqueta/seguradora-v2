<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\ContractEvent;

class ContractEventLogger
{
    /**
     * Registra um evento genérico associado a um contrato.
     *
     * @param Contract $contract Instância do contrato alvo.
     * @param string $type Tipo do evento (ex.: status_update, reativacao, integracao_sulamerica).
     * @param string|null $description Texto descritivo opcional.
     * @param array $metadata Metadados adicionais para auditoria.
     * @param string|null $payload Payload da requisição/resposta (opcional).
     * @param string|int|null $userId ID do usuário que realizou a ação (opcional).
     * @return ContractEvent Evento persistido.
     */
    public static function log(Contract $contract, string $type, ?string $description = null, array $metadata = [], ?string $payload = null, string|int|null $userId = null): ContractEvent
    {
        return ContractEvent::create([
            'contract_id' => $contract->id,
            'user_id' => $userId,
            'event_type' => $type,
            'description' => $description,
            'metadata' => $metadata,
            'payload' => $payload,
        ]);
    }

    /**
     * Registra uma mudança de status do contrato.
     *
     * @param Contract $contract Instância do contrato alvo.
     * @param string|null $from Status anterior (pode ser null).
     * @param string|null $to Novo status (pode ser null).
     * @param string|null $description Texto descritivo opcional.
     * @param array $metadata Metadados adicionais.
     * @param string|null $payload Payload da requisição/resposta (opcional).
     * @param string|int|null $userId ID do usuário que realizou a ação.
     * @return ContractEvent Evento persistido.
     */
    public static function logStatusChange(Contract $contract, ?string $from, ?string $to, ?string $description = null, array $metadata = [], ?string $payload = null, string|int|null $userId = null): ContractEvent
    {
        return ContractEvent::create([
            'contract_id' => $contract->id,
            'user_id' => $userId,
            'event_type' => 'status_update',
            'description' => $description,
            'from_status' => $from,
            'to_status' => $to,
            'metadata' => $metadata,
            'payload' => $payload,
        ]);
    }

    /**
     * Helper: registra evento buscando o contrato pelo token.
     *
     * @param string $tokenContrato Token do contrato.
     * @param string $type Tipo do evento.
     * @param string|null $description Descrição.
     * @param array $metadata Metadados.
     * @param string|null $payload Payload.
     * @param string|int|null $userId Usuário (opcional).
     * @return ContractEvent|null Evento ou null se não encontrar o contrato.
     */
    public static function logByToken(string $tokenContrato, string $type, ?string $description = null, array $metadata = [], ?string $payload = null, string|int|null $userId = null): ?ContractEvent
    {
        $contract = Contract::where('token', $tokenContrato)->first();
        if (!$contract) {
            return null;
        }
        return self::log($contract, $type, $description, $metadata, $payload, $userId);
    }

    /**
     * Helper: registra mudança de status buscando o contrato pelo token.
     *
     * @param string $tokenContrato Token do contrato.
     * @param string|null $from Status anterior.
     * @param string|null $to Novo status.
     * @param string|null $description Descrição.
     * @param array $metadata Metadados.
     * @param string|null $payload Payload.
     * @param string|int|null $userId Usuário (opcional).
     * @return ContractEvent|null Evento ou null se não encontrar o contrato.
     */
    public static function logStatusChangeByToken(string $tokenContrato, ?string $from, ?string $to, ?string $description = null, array $metadata = [], ?string $payload = null, string|int|null $userId = null): ?ContractEvent
    {
        $contract = Contract::where('token', $tokenContrato)->first();
        if (!$contract) {
            return null;
        }
        return self::logStatusChange($contract, $from, $to, $description, $metadata, $payload, $userId);
    }
}