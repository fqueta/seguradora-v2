<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ContractEvent;
use Illuminate\Support\Facades\DB;

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

        $supplier = strtolower((string) $request->get('supplier', ''));
        $from = $request->get('from');
        $to = $request->get('to');
        $statusFilter = strtolower((string) $request->get('status', ''));

        $query = ContractEvent::with(['contract.client'])
            ->where('event_type', 'like', 'integracao%');

        if (in_array($supplier, ['sulamerica', 'lsx', 'alloyal'])) {
            if ($supplier === 'sulamerica') {
                $query->where('event_type', 'like', 'integracao_sulamerica%');
            } elseif ($supplier === 'lsx') {
                $query->where('event_type', 'like', 'integracao_lsx%');
            } else {
                // Não há eventos de contrato para Alloyal; serão agregados abaixo via usermeta
            }
        }
        if ($from && $to) {
            try {
                $start = new \Carbon\Carbon($from);
                $end = (new \Carbon\Carbon($to))->endOfDay();
                $query->whereBetween('created_at', [$start, $end]);
            } catch (\Throwable $e) {}
        }

        $events = $query->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($e) {
                $contract = $e->contract;
                $client = $contract ? $contract->client : null;
                $supplierName = (str_contains($e->event_type, 'sulamerica') ? 'sulamerica' : (str_contains($e->event_type, 'lsx') ? 'lsx' : 'other'));
                $meta = is_array($e->metadata) ? $e->metadata : [];
                $status = isset($meta['status']) ? strtolower((string)$meta['status']) : (str_contains(strtolower($e->description), 'sucesso') ? 'success' : (str_contains(strtolower($e->description), 'falha') ? 'error' : null));
                return [
                    'id' => $e->id,
                    'event_type' => $e->event_type,
                    'supplier' => $supplierName,
                    'status' => $status,
                    'description' => $e->description,
                    'created_at' => $e->created_at,
                    'contract_id' => $contract ? $contract->id : null,
                    'contract_number' => $contract ? ($contract->contract_number ?? $contract->c_number ?? null) : null,
                    'contract_token' => $contract ? $contract->token : null,
                    'client_id' => $client ? $client->id : null,
                    'client_name' => $client ? $client->name : null,
                ];
            });

        // Agregar eventos de integração do Clube Alloyal (usermeta)
        // Metakeys relevantes: is_alloyal, token_alloyal, is_mileto_user
        if (!$supplier || $supplier === 'alloyal') {
            $alloyalRows = DB::table('usermeta')
                ->select(['user_id', 'meta_key', 'meta_value', 'created_at'])
                ->whereIn('meta_key', ['is_alloyal', 'token_alloyal', 'is_mileto_user'])
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            foreach ($alloyalRows as $row) {
                $user = \App\Models\User::find($row->user_id);
                $events->push([
                    'id' => 'alloyal_' . $row->user_id . '_' . $row->created_at,
                    'event_type' => 'integracao_alloyal',
                    'supplier' => 'alloyal',
                    'status' => (str_contains(strtolower((string)$row->meta_key), 'token') ? null : 'success'),
                    'description' => 'Evento de integração Alloyal: ' . $row->meta_key,
                    'created_at' => $row->created_at,
                    'contract_id' => null,
                    'contract_number' => null,
                    'contract_token' => null,
                    'client_id' => $user ? $user->id : null,
                    'client_name' => $user ? $user->name : null,
                ]);
            }
        }

        // Ordena novamente e limita ao total solicitado
        $events = $events->sortByDesc('created_at')->values()->slice(0, $limit)->values();

        if (in_array($statusFilter, ['success', 'error', 'skipped'])) {
            $events = $events->filter(function ($ev) use ($statusFilter) {
                return ($ev['status'] ?? null) === $statusFilter;
            })->values();
        }

        return response()->json([
            'success' => true,
            'data' => $events,
        ]);
    }
}
