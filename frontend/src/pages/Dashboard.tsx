import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { coursesService } from "@/services/coursesService";
import { dashboardChartsService } from "@/services/dashboardChartsService";
import { useRecentActivities } from "@/hooks/useDashboard";
import { useRecentIntegrationEvents } from "@/hooks/useIntegrations";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollmentsList } from "@/hooks/enrollments";
import { Building2, Stethoscope, Gift } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

/**
 * Dashboard
 * pt-BR: Página principal simplificada com cards de KPI (Interessados, Alunos e Cursos)
 *        e atalhos rápidos, seguindo o estilo visual do exemplo compartilhado.
 * en-US: Simplified main dashboard with KPI cards (Leads, Students, Courses)
 *        and quick actions, matching the shared visual style.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /**
   * KpiCardLink
   * pt-BR: Componente auxiliar para tornar um Card inteiro clicável, navegando
   *        para a rota especificada via `Link`.
   * en-US: Helper component to make a whole Card clickable, navigating to the
   *        specified route using `Link`.
   */
  function KpiCardLink({ to, children }: { to: string; children: React.ReactNode }) {
    return (
      <Link
        to={to}
        className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-md"
        aria-label="Abrir seção relacionada ao indicador"
      >
        {/*
         * pt-BR: Usamos classes utilitárias para indicar interatividade do Card.
         * en-US: Utility classes hint the Card is interactive.
         */}
        <div className="hover:shadow-md transition-shadow cursor-pointer">
          {children}
        </div>
      </Link>
    );
  }

  /**
   * pt-BR: Consulta rápida para obter o total de cursos.
   * en-US: Quick query to get total number of courses.
   */
  const coursesTotalQuery = useQuery({
    queryKey: ["courses", "count"],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  /**
   * pt-BR: Totais de matrículas por situação: "mat" (ativas) e "int" (interessados).
   * en-US: Enrollment totals by situation: "mat" (active) and "int" (leads).
   */
  const { data: activeEnrollResp } = useEnrollmentsList({ page: 1, per_page: 1, situacao: "mat" } as any);
  const { data: interestEnrollResp } = useEnrollmentsList({ page: 1, per_page: 1, situacao: "int" } as any);

  const totalCursos = (coursesTotalQuery.data as any)?.total || 0;
  const totalAlunos = (activeEnrollResp as any)?.total || 0;
  const totalInteressados = (interestEnrollResp as any)?.total || 0;

  /**
   * pt-BR: Dados mockados para gráficos anuais (2024/2025) de interessados e matriculados.
   * en-US: Mocked yearly data (2024/2025) for leads and enrolled charts.
   */
  const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  /**
   * Filtro de ano
   * pt-BR: Ano selecionado pelo painel; comparativo é o ano anterior.
   * en-US: Selected year from filter; comparison is previous year.
   */
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const comparisonYear = selectedYear - 1;
  const keyCurr = `y${selectedYear}`;
  const keyPrev = `y${comparisonYear}`;

  // Estados iniciais baseados no ano selecionado
  const initialSeries = months.map((m) => ({ mes: m, [keyPrev]: 0, [keyCurr]: 0 } as any));
  const [contractsMonthlyData, setContractsMonthlyData] = useState<Array<{ mes: string; [key: string]: string | number }>>(initialSeries);

  /**
   * dashboardSummaryQuery
   * pt-BR: Consulta React Query para obter o resumo consolidado do Dashboard.
   *        Atualiza os estados dos gráficos ao receber os dados.
   * en-US: React Query to fetch consolidated Dashboard summary.
   *        Updates chart states when data arrives.
   */
  const dashboardSummaryQuery = useQuery({
    queryKey: ["dashboard", "summary", selectedYear],
    queryFn: () => dashboardChartsService.getSummary({ year: selectedYear }),
    staleTime: 5 * 60 * 1000,
  });

  const recentActivitiesQuery = useRecentActivities(8);
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("30d");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const computePeriod = () => {
    const now = new Date();
    if (periodFilter === "7d") {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    if (periodFilter === "30d") {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    return {};
  };
  const periodParams = computePeriod();
  const recentIntegrationsQuery = useRecentIntegrationEvents(
    8,
    {
      supplier: supplierFilter === "all" ? undefined : supplierFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      ...(periodParams as any),
    },
    { enabled: (user?.permission_id ?? 99) < 3 }
  );

  useEffect(() => {
    const charts = dashboardSummaryQuery.data?.data?.charts as any;
    if (charts?.contracts && Array.isArray(charts.contracts)) {
      setContractsMonthlyData(charts.contracts);
    }
  }, [dashboardSummaryQuery.data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da seguradora</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-700">Resumo</Badge>
          {/* <Badge className="bg-gray-100 text-gray-700">KPI</Badge> */}
        </div>
      </div>

      {/* Painel de Filtros */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">Filtros</CardTitle>
          <CardDescription>Selecione o período para os gráficos</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm text-muted-foreground" htmlFor="year-select">Ano</label>
            <select
              id="year-select"
              className="border rounded-md px-2 py-1 text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              aria-label="Selecionar ano"
            >
              {Array.from({ length: 6 }).map((_, idx) => {
                const y = new Date().getFullYear() - idx;
                return (
                  <option key={y} value={y}>{y}</option>
                );
              })}
            </select>
            {dashboardSummaryQuery.isFetching && (
              <span className="text-xs text-muted-foreground">Atualizando dados…</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards KPI no topo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCardLink to="/admin/contracts">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Contratos</CardTitle>
              <CardDescription>Total emitidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(dashboardSummaryQuery.data?.data?.counts?.contracts ?? 0)}
              </div>
            </CardContent>
          </Card>
        </KpiCardLink>

        <KpiCardLink to="/admin/clients">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <CardDescription>Cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(dashboardSummaryQuery.data?.data?.counts?.clients ?? 0)}
              </div>
            </CardContent>
          </Card>
        </KpiCardLink>

        <KpiCardLink to="/admin/settings/users?permission_id=8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Fornecedores</CardTitle>
              <CardDescription>Parceiros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(dashboardSummaryQuery.data?.data?.counts?.suppliers ?? 0)}
              </div>
            </CardContent>
          </Card>
        </KpiCardLink>

        <KpiCardLink to="/admin/settings/users">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Usuários</CardTitle>
              <CardDescription>Total do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(dashboardSummaryQuery.data?.data?.counts?.users ?? 0)}
              </div>
            </CardContent>
          </Card>
        </KpiCardLink>

      </div>

      

      {/* Gráfico de Contratos: Realizados */}
      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Contratos Realizados ({selectedYear})</CardTitle>
            <CardDescription>
              Comparativo {comparisonYear} x {selectedYear}
              {dashboardSummaryQuery.isFetching && (
                <span className="ml-2 text-xs">(Atualizando)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contractsMonthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={keyCurr} stroke="#111827" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name={`Contratos ${selectedYear}`} />
                  <Line type="monotone" dataKey={keyPrev} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name={`Contratos ${comparisonYear}`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards secundários: Atividades Recentes e Integrações Recentes */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Atividades Recentes</CardTitle>
            <CardDescription>Últimas ações de clientes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivitiesQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : recentActivitiesQuery.isError ? (
              <div className="text-sm text-destructive">Não foi possível carregar as atividades.</div>
            ) : (recentActivitiesQuery.data?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma atividade recente.</div>
            ) : (
              <div className="divide-y">
                {recentActivitiesQuery.data?.map((activity: any) => (
                  <div key={activity.id} className="flex items-center gap-3 py-3">
                    <div
                      className={
                        "h-3 w-3 rounded-full mt-0.5 " +
                        (activity.status === "actived"
                          ? "bg-green-500"
                          : activity.status === "pre_registred"
                          ? "bg-blue-500"
                          : activity.status === "inactived"
                          ? "bg-red-500"
                          : "bg-gray-400")
                      }
                      aria-hidden="true"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{activity.title || activity.client}</div>
                      <div className="text-xs text-muted-foreground">
                        {(activity.cpf || activity.cnpj || activity.email) ?? ""} {activity.time ? `• ${activity.time}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {(user?.permission_id ?? 99) < 3 && (
          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Integrações Recentes</CardTitle>
              <CardDescription>Atualizações de credenciais e integrações</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <select
                  className="border rounded-md px-2 py-1 text-xs"
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  aria-label="Filtrar fornecedor"
                >
                  <option value="all">Todos</option>
                  <option value="sulamerica">SulAmérica</option>
                  <option value="lsx">LSX Medical</option>
                  <option value="alloyal">Alloyal</option>
                </select>
                <select
                  className="border rounded-md px-2 py-1 text-xs"
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  aria-label="Filtrar período"
                >
                  <option value="7d">7 dias</option>
                  <option value="30d">30 dias</option>
                  <option value="all">Todos</option>
                </select>
                <select
                  className="border rounded-md px-2 py-1 text-xs"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filtrar status"
                >
                  <option value="all">Status: Todos</option>
                  <option value="success">Sucesso</option>
                  <option value="error">Erro</option>
                  <option value="skipped">Ignorado</option>
                </select>
              </div>
              {recentIntegrationsQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Carregando…</div>
              ) : recentIntegrationsQuery.isError ? (
                <div className="text-sm text-destructive">Não foi possível carregar integrações.</div>
              ) : (recentIntegrationsQuery.data?.length ?? 0) === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma integração recente.</div>
              ) : (
                <div className="divide-y">
                  {recentIntegrationsQuery.data?.map((ev: any) => (
                    <div key={ev.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {ev.supplier === "sulamerica" ? (
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        ) : ev.supplier === "lsx" ? (
                          <Stethoscope className="h-4 w-4 text-muted-foreground" />
                        ) : ev.supplier === "alloyal" ? (
                          <Gift className="h-4 w-4 text-muted-foreground" />
                        ) : null}
                        <div>
                          {ev.contract_id ? (
                            <Link
                              to={`/admin/contracts/${ev.contract_id}`}
                              className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
                              aria-label={`Abrir contrato ${ev.contract_id}`}
                            >
                              {ev.client_name || "Cliente"} {ev.contract_number ? `• Contrato ${ev.contract_number}` : `• #${ev.contract_id}`}
                            </Link>
                          ) : ev.supplier === "alloyal" && ev.client_id ? (
                            <Link
                              to={`/admin/clients/${ev.client_id}/view`}
                              className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
                              aria-label={`Abrir cliente ${ev.client_id}`}
                            >
                              {ev.client_name || "Cliente"}
                            </Link>
                          ) : (
                            <div className="text-sm font-medium">
                              {ev.client_name || "Cliente"} {ev.contract_number ? `• Contrato ${ev.contract_number}` : ev.contract_id ? `• #${ev.contract_id}` : ""}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {(ev.supplier === "sulamerica" ? "SulAmérica" : ev.supplier === "lsx" ? "LSX Medical" : ev.supplier === "alloyal" ? "Alloyal" : "Integração")}
                            {ev.created_at ? ` • ${new Date(ev.created_at).toLocaleDateString()}` : ""}
                          </div>
                        </div>
                      </div>
                      {ev.status && (
                        <Badge
                          className={
                            "text-[11px] px-2 py-0.5 " +
                            (ev.status === "success"
                              ? "bg-green-100 text-green-700"
                              : ev.status === "error"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700")
                          }
                        >
                          {ev.status === "success" ? "Sucesso" : ev.status === "error" ? "Erro" : "Ignorado"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
