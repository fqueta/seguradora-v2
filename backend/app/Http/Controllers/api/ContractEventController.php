<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ContractEvent;

class ContractEventController extends Controller
{
    /**
     * pt-BR: Lista eventos recentes de integração vinculados a contratos
     * en-US: List recent integration events linked to contracts
     */
    public function recent(Request $request)
    {
        $limit = (int) ($request->get('limit', 10));
        if ($limit < 1 || $limit > 100) {
            $limit = 10;
        }

        $events = ContractEvent::with(['contract.client'])
            ->where('event_type', 'like', 'integracao%')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($e) {
                $contract = $e->contract;
                $client = $contract ? $contract->client : null;
                return [
                    'id' => $e->id,
                    'event_type' => $e->event_type,
                    'description' => $e->description,
                    'created_at' => $e->created_at,
                    'contract_id' => $contract ? $contract->id : null,
                    'contract_number' => $contract ? ($contract->contract_number ?? $contract->c_number ?? null) : null,
                    'contract_token' => $contract ? $contract->token : null,
                    'client_name' => $client ? $client->name : null,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $events,
        ]);
    }
}
