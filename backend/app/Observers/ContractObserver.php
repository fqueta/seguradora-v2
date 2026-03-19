<?php

namespace App\Observers;

use App\Models\Contract;
use App\Notifications\ContractApprovedNotification;
use Illuminate\Support\Facades\Log;

class ContractObserver
{
    /**
     * Handle the Contract "updated" event.
     */
    public function updated(Contract $contract): void
    {
        // pt-BR: Verifica se o status mudou de qualquer valor anterior para 'approved'
        // en-US: Checks if status changed from any previous value to 'approved'
        if ($contract->wasChanged('status') && $contract->status === 'approved') {
            $client = $contract->client;

            if ($client && $client->email) {
                try {
                    $client->notify(new ContractApprovedNotification($contract));
                    Log::info('ContractObserver: Notificação de aprovação enviada para o cliente ID: ' . $client->id);
                } catch (\Exception $e) {
                    Log::error('ContractObserver: Erro ao enviar notificação para o cliente ID: ' . $client->id . '. Erro: ' . $e->getMessage());
                }
            } else {
                Log::warning('ContractObserver: Não foi possível enviar notificação, cliente não encontrado ou sem e-mail para o contrato ID: ' . $contract->id);
            }
        }
    }

    /**
     * Handle the Contract "created" event.
     * Caso o contrato já seja criado com status 'approved'
     */
    public function created(Contract $contract): void
    {
        if ($contract->status === 'approved') {
            $client = $contract->client;

            if ($client && $client->email) {
                try {
                    $client->notify(new ContractApprovedNotification($contract));
                    Log::info('ContractObserver: Notificação de aprovação enviada para o cliente ID (Novo Contrato): ' . $client->id);
                } catch (\Exception $e) {
                    Log::error('ContractObserver: Erro ao enviar notificação para novo contrato. Cliente ID: ' . $client->id . '. Erro: ' . $e->getMessage());
                }
            }
        }
    }
}
