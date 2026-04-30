<?php

namespace App\Observers;

use App\Models\Contract;
use App\Notifications\ContractApprovedNotification;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\api\AlloyalController;

class ContractObserver
{
    /**
     * Handle the Contract "created" event.
     * Caso o contrato já seja criado com status 'approved'
     */
    public function created(Contract $contract): void
    {
        // Registro de auditoria genérico
        \App\Services\ContractEventLogger::log(
            $contract,
            'creation',
            'Contrato criado via sistema',
            [
                'route' => request()->fullUrl(),
                'method' => request()->method(),
                'ip' => request()->ip(),
            ],
            json_encode(request()->except(['password', 'password_confirmation', 'token_api'])),
            auth()->id()
        );

        if ($contract->status === 'approved') {
            $client = $contract->client;

            // Integrar com Alloyal somente na aprovação do contrato
            if ($client) {
                $this->syncWithAlloyal($client);
            }

            if ($client && $client->email) {
                try {
                    $client->notify(new ContractApprovedNotification($contract));
                    Log::info('ContractObserver: Notificação de aprovação enviada para o cliente ID (Novo Contrato): ' . $client->id);

                    // pt-BR: Registro de auditoria do envio de e-mail
                    \App\Services\ContractEventLogger::log(
                        $contract,
                        'email_notification',
                        'E-mail de aprovação enviado ao cliente (Criação)',
                        ['email' => $client->email, 'notification' => 'ContractApprovedNotification'],
                        null,
                        auth()->id()
                    );
                } catch (\Exception $e) {
                    Log::error('ContractObserver: Erro ao enviar notificação para novo contrato. Cliente ID: ' . $client->id . '. Erro: ' . $e->getMessage());

                    // pt-BR: Registro de falha no envio de e-mail
                    \App\Services\ContractEventLogger::log(
                        $contract,
                        'email_notification_failed',
                        'Falha ao enviar e-mail de aprovação ao cliente (Criação)',
                        ['email' => $client->email, 'error' => $e->getMessage()],
                        null,
                        auth()->id()
                    );
                }
            }
        }
    }

    /**
     * Handle the Contract "updated" event.
     */
    public function updated(Contract $contract): void
    {
        // Registro de auditoria genérico
        if ($contract->wasChanged()) {
            \App\Services\ContractEventLogger::log(
                $contract,
                'update',
                'Contrato atualizado via sistema',
                [
                    'route' => request()->fullUrl(),
                    'method' => request()->method(),
                    'ip' => request()->ip(),
                    'changed_fields' => array_keys($contract->getChanges())
                ],
                json_encode(request()->except(['password', 'password_confirmation', 'token_api'])),
                auth()->id()
            );
        }

        // pt-BR: Verifica se o status mudou de qualquer valor anterior para 'approved'
        // en-US: Checks if status changed from any previous value to 'approved'
        if ($contract->wasChanged('status') && $contract->status === 'approved') {
            $client = $contract->client;

            // Integrar com Alloyal somente na aprovação do contrato
            if ($client) {
                $this->syncWithAlloyal($client);
            }

            if ($client && $client->email) {
                try {
                    $client->notify(new ContractApprovedNotification($contract));
                    Log::info('ContractObserver: Notificação de aprovação enviada para o cliente ID: ' . $client->id);

                    // pt-BR: Registro de auditoria do envio de e-mail
                    \App\Services\ContractEventLogger::log(
                        $contract,
                        'email_notification',
                        'E-mail de aprovação enviado ao cliente',
                        ['email' => $client->email, 'notification' => 'ContractApprovedNotification'],
                        null,
                        auth()->id()
                    );
                } catch (\Exception $e) {
                    Log::error('ContractObserver: Erro ao enviar notificação para o cliente ID: ' . $client->id . '. Erro: ' . $e->getMessage());

                    // pt-BR: Registro de falha no envio de e-mail
                    \App\Services\ContractEventLogger::log(
                        $contract,
                        'email_notification_failed',
                        'Falha ao enviar e-mail de aprovação ao cliente',
                        ['email' => $client->email, 'error' => $e->getMessage()],
                        null,
                        auth()->id()
                    );
                }
            } else {
                Log::warning('ContractObserver: Não foi possível enviar notificação, cliente não encontrado ou sem e-mail para o contrato ID: ' . $contract->id);
            }
        }
    }

    /**
     * Sincroniza o cliente com a Alloyal
     * PT: Disparado apenas quando um contrato é aprovado
     */
    private function syncWithAlloyal($client): void
    {
        try {
            $payloadAlloyal = [
                'name' => (string)$client->name,
                'cpf' => (string)$client->cpf,
            ];
            
            $alloyalController = new AlloyalController();
            $retAlloyal = $alloyalController->create_user_atived($payloadAlloyal, $client->id);
            
            \App\Services\UserEventLogger::log(
                $client,
                'integration_alloyal',
                isset($retAlloyal['exec']) && $retAlloyal['exec']
                    ? "Sincronização Alloyal realizada com sucesso (via Aprovação de Contrato)"
                    : "Falha na sincronização Alloyal: " . ($retAlloyal['message'] ?? 'Erro desconhecido'),
                [],
                $retAlloyal,
                ['source' => 'ContractObserver@syncWithAlloyal'],
                $payloadAlloyal
            );
        } catch (\Throwable $e) {
            Log::error('ContractObserver: Erro na integração Alloyal para o cliente ID ' . $client->id . ': ' . $e->getMessage());
        }
    }
}
