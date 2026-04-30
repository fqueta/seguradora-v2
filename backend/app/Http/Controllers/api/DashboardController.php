<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Retorna dados consolidados para o Dashboard
     * pt-BR: Atividades recentes, estatísticas de cadastro e totais.
     * en-US: Recent activities, registration stats and totals.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $orgId = null;
        if ($user && $user->permission_id >= 3) {
            $orgId = $user->organization_id;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'recent_activities' => $this->getRecentActivities($orgId),
                'registration_data' => $this->getRegistrationData($orgId),
                'pending_pre_registrations' => $this->getPendingPreRegistrations($orgId),
                'totals' => $this->getTotals($orgId),
            ]
        ]);
    }

    /**
     * Obtém as últimas atividades registradas
     */
    private function getRecentActivities($orgId)
    {
        $query = UserEvent::with(['user', 'author'])
            ->orderBy('created_at', 'desc')
            ->limit(10);

        if ($orgId) {
            $query->whereHas('user', function ($q) use ($orgId) {
                $q->where('organization_id', $orgId);
            });
        }

        return $query->get()->map(function ($event) {
            return [
                'id' => $event->id,
                'name' => $event->user->name ?? 'Sistema',
                'email' => $event->user->email ?? null,
                'status' => $event->user->status ?? 'unknown',
                'type' => $event->event_type,
                'title' => $event->description ?? $this->mapEventTypeToTitle($event->event_type),
                'created_at' => $event->created_at->format('d/m/Y H:i'),
            ];
        });
    }

    /**
     * Mapeia tipos de evento para títulos amigáveis
     */
    private function mapEventTypeToTitle($type)
    {
        $map = [
            'client_registered' => 'Novo cliente cadastrado',
            'client_updated' => 'Cliente atualizado',
            'client_activated' => 'Cliente ativado',
            'client_inactivated' => 'Cliente inativado',
            'pre_cadastro' => 'Pré-cadastro realizado',
            'integration_alloyal' => 'Sincronização Alloyal',
            'integration_iza_submit' => 'Integração IZA (Contrato)',
            'integration_iza_cancel' => 'Cancelamento IZA',
        ];

        return $map[$type] ?? 'Atividade no sistema';
    }

    /**
     * Dados de cadastro por período (últimos 30 dias)
     */
    private function getRegistrationData($orgId)
    {
        $startDate = now()->subDays(30)->startOfDay();
        
        $query = User::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw("SUM(CASE WHEN status = 'actived' THEN 1 ELSE 0 END) as actived"),
                DB::raw("SUM(CASE WHEN status = 'inactived' THEN 1 ELSE 0 END) as inactived"),
                DB::raw("SUM(CASE WHEN status = 'pre_registred' THEN 1 ELSE 0 END) as pre_registred")
            )
            ->where('created_at', '>=', $startDate)
            ->where('excluido', 'n')
            ->where('deletado', 'n')
            ->where('permission_id', 7); // Clientes

        if ($orgId) {
            $query->where('organization_id', $orgId);
        }

        return $query->groupBy('date')
            ->orderBy('date', 'asc')
            ->get();
    }

    /**
     * Pré-registros pendentes
     */
    private function getPendingPreRegistrations($orgId)
    {
        $query = User::where('status', 'pre_registred')
            ->where('excluido', 'n')
            ->where('deletado', 'n')
            ->where('permission_id', 7)
            ->limit(10)
            ->orderBy('created_at', 'desc');

        if ($orgId) {
            $query->where('organization_id', $orgId);
        }

        return $query->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->config['phone'] ?? $u->config['main_cell_phone'] ?? 'N/A',
                'date' => $u->created_at->format('Y-m-d'),
                'type' => $u->tipo_pessoa === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física',
            ];
        });
    }

    /**
     * Totais gerais
     */
    private function getTotals($orgId)
    {
        $query = User::where('excluido', 'n')
            ->where('deletado', 'n')
            ->where('permission_id', 7);

        if ($orgId) {
            $query->where('organization_id', $orgId);
        }

        $counts = $query->select(
            DB::raw("SUM(CASE WHEN status = 'actived' THEN 1 ELSE 0 END) as actived"),
            DB::raw("SUM(CASE WHEN status = 'inactived' THEN 1 ELSE 0 END) as inactived"),
            DB::raw("SUM(CASE WHEN status = 'pre_registred' THEN 1 ELSE 0 END) as pre_registred")
        )->first();

        // Cálculo de variação (exemplo simples: total de hoje vs ontem)
        $variation = 0;
        $totalToday = User::whereDate('created_at', now())->count();
        $totalYesterday = User::whereDate('created_at', now()->subDay())->count();
        
        if ($totalYesterday > 0) {
            $variation = (($totalToday - $totalYesterday) / $totalYesterday) * 100;
        }

        return [
            'actived' => (int) ($counts->actived ?? 0),
            'inactived' => (int) ($counts->inactived ?? 0),
            'pre_registred' => (int) ($counts->pre_registred ?? 0),
            'variation_percentage' => round($variation, 2),
        ];
    }
}
