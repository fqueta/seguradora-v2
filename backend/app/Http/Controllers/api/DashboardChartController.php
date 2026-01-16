<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * DashboardChartController
 * pt-BR: Endpoints simples que retornam dados mocados para os gráficos
 *        de Interessados e Matriculados do Dashboard (2024/2025).
 * en-US: Simple endpoints returning mocked data for Dashboard charts
 *        of Leads and Enrolled (years 2024/2025).
 */
class DashboardChartController extends Controller
{
    /**
     * summary
     * pt-BR: Retorna payload único com todos os dados necessários ao Dashboard.
     *        Inclui gráficos de Interessados e Matriculados (dados mocados 2024/2025).
     * en-US: Returns a single payload with all Dashboard required data.
     *        Includes charts for Leads and Enrolled (mocked 2024/2025).
     */
    public function summary(Request $request)
    {
        $months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

        /**
         * Ano dinâmico via painel
         * pt-BR: Recebe `year` via querystring (ex.: /dashboard/summary?year=2025).
         *        Se não informado, usa o ano corrente. O comparativo é o ano anterior.
         * en-US: Receives `year` via querystring (e.g., /dashboard/summary?year=2025).
         *        Defaults to current year if not provided. Comparison is previous year.
         */
        $selectedYear = (int) ($request->input('year', date('Y')));
        if ($selectedYear < 2000 || $selectedYear > 3000) {
            $selectedYear = (int) date('Y');
        }
        $comparisonYear = $selectedYear - 1;

        // Contagens de entidades do sistema
        $contractsCount = 0;
        $clientsCount = 0;
        $suppliersCount = 0;
        $usersCount = 0;

        // Verifica permissão do usuário para filtrar por organização
        $user = $request->user();
        $orgId = null;
        if ($user && $user->permission_id >= 3) {
            $orgId = $user->organization_id;
        }

        try {
            // Contracts count
            $qContracts = DB::table('contracts')->whereNull('deleted_at');
            if ($orgId) {
                $qContracts->where('organization_id', $orgId);
            }
            $contractsCount = $qContracts->count();
            
            // permission_id: 7 = Clientes
            $qClients = DB::table('users')
                ->where('permission_id', 7)
                ->where('excluido', 'n')
                ->where('deletado', 'n');
            if ($orgId) {
                $qClients->where('organization_id', $orgId);
            }
            $clientsCount = $qClients->count();
                
            // permission_id: 8 = Fornecedores
            $qSuppliers = DB::table('users')
                ->where('permission_id', 8)
                ->where('excluido', 'n')
                ->where('deletado', 'n');
            if ($orgId) {
                $qSuppliers->where('organization_id', $orgId);
            }
            $suppliersCount = $qSuppliers->count();
                
            // Total users
            $qUsers = DB::table('users')
                ->where('excluido', 'n')
                ->where('deletado', 'n');
            if ($orgId) {
                $qUsers->where('organization_id', $orgId);
            }
            $usersCount = $qUsers->count();
                
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Erro ao contar entidades no Dashboard: ' . $e->getMessage());
            // Mantém counts como 0
        }

        // Gráfico de Contratos: selecionado vs anterior
        $contractsPrev = $this->getContractsMonthlyCounts($comparisonYear, $orgId);
        $contractsCurr = $this->getContractsMonthlyCounts($selectedYear, $orgId);

        // Monta séries no formato esperado pelo frontend, com chaves dinâmicas y{ano}
        $keyPrev = 'y' . $comparisonYear;
        $keyCurr = 'y' . $selectedYear;

        $contractsChart = [];
        for ($m = 1; $m <= 12; $m++) {
            $contractsChart[] = [
                'mes' => $months[$m - 1],
                $keyPrev => $contractsPrev[$m] ?? 0,
                $keyCurr => $contractsCurr[$m] ?? 0,
            ];
        }

        $payload = [
            'data' => [
                'counts' => [
                    'contracts' => $contractsCount,
                    'clients' => $clientsCount,
                    'suppliers' => $suppliersCount,
                    'users' => $usersCount,
                ],
                'charts' => [
                    // Removemos old logic de matriculas/interessados
                    // 'interested' => $interested,
                    // 'enrolled'   => $enrolled,
                    'contracts'  => $contractsChart,
                ],
                // pt-BR: Inclui metadados de ano selecionado e comparativo
                // en-US: Include selected and comparison year metadata
                'meta' => [
                    'selected_year' => $selectedYear,
                    'comparison_year' => $comparisonYear,
                ],
            ],
        ];

        return response()->json($payload);
    }
    
    /**
     * getContractsMonthlyCounts
     * pt-BR: Retorna contagens de contratos criados por mês para um ano específico.
     * en-US: Returns monthly created contracts count for a specific year.
     * @param int $year Ano alvo (ex.: 2024)
     * @param string|null $orgId ID da organização para filtro (opcional)
     * @return array<int,int> Mapa mês(1-12) => contagem
     */
    private function getContractsMonthlyCounts(int $year, ?string $orgId = null): array
    {
        try {
            // Consulta agregada por mês usando a coluna 'created_at' de contracts
             // SQLite usa strftime('%m', created_at), MySQL usa MONTH(created_at).
             // Para compatibilidade simples com Laravel Query Builder + driver detection:
            
            $query = DB::table('contracts')
                ->whereNull('deleted_at')
                ->whereYear('created_at', $year);

            if ($orgId) {
                $query->where('organization_id', $orgId);
            }

            // Detecta driver para query date adequada
            $driver = DB::connection()->getDriverName();
            if ($driver === 'sqlite') {
                $query->selectRaw("strftime('%m', created_at) as month, COUNT(*) as total");
            } else {
                // assume mysql/pgsql
                $query->selectRaw('MONTH(created_at) as month, COUNT(*) as total');
            }

            $rows = $query
                ->groupBy('month')
                ->get();

            $out = [];
            foreach ($rows as $r) {
                // SQLite pode retornar "01", MySQL retorna 1. Cast para int resolve.
                $month = (int) ($r->month ?? 0);
                if ($month >= 1 && $month <= 12) {
                    $out[$month] = (int) $r->total;
                }
            }
            // Garante chaves ausentes com zero
            for ($m = 1; $m <= 12; $m++) {
                if (!array_key_exists($m, $out)) {
                    $out[$m] = 0;
                }
            }
            ksort($out);
            return $out;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Erro chart contracts: ' . $e->getMessage());
            return array_fill(1, 12, 0);
        }
    }
}