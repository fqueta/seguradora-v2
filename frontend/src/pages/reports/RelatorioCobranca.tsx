import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { organizationService } from "@/services/organizationService";
import { productsService } from "@/services/productsService";
import { billingReportService } from "@/services/billingReportService";
import type { Organization } from "@/types/organization";
import type { Product } from "@/types/products";
import type { BillingReportData } from "@/types/billingReport";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileDown, FileSpreadsheet, Filter, RotateCcw, Receipt } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { dataParaBR } from "@/lib/qlib";
import { cpfApplyMask } from "@/lib/masks/cpf-apply-mask";
import { cnpjApplyMask } from "@/lib/masks/cnpj-apply-mask";

export default function RelatorioCobranca() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados dos filtros
  const [orgId, setOrgId] = useState<string>(() => searchParams.get("organization_id") || "");
  const [productId, setProductId] = useState<string>(() => searchParams.get("product_id") || "");
  const [referenceMonth, setReferenceMonth] = useState<number>(() => Number(searchParams.get("month")) || new Date().getMonth() + 1);
  const [referenceYear, setReferenceYear] = useState<number>(() => Number(searchParams.get("year")) || new Date().getFullYear());

  // Dados auxiliares
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [allowedProducts, setAllowedProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Estados de controle e dados do relatório
  const [loadingFilters, setLoadingFilters] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [reportData, setReportData] = useState<BillingReportData | null>(null);

  // Carregar organizações com billing configurado e produtos
  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        setLoadingFilters(true);
        // Carrega todas as organizações
        const orgsRes = await organizationService.list({ per_page: 999 });
        // Filtra organizações que possuem billing configurado
        const orgsWithBilling = (orgsRes.data || []).filter(
          (o) => o.config?.billing?.cycle_start_day && o.config?.billing?.products_pricing?.length > 0
        );
        setOrganizations(orgsWithBilling);

        // Carrega todos os produtos para ter mapeamento de nomes
        const productsRes = await productsService.list({ per_page: 999 });
        setAllProducts(productsRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar filtros");
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFiltersData();
  }, []);

  // Atualizar produtos permitidos quando a organização selecionada mudar
  useEffect(() => {
    if (!orgId || organizations.length === 0) {
      setAllowedProducts([]);
      setProductId("");
      return;
    }

    const selectedOrg = organizations.find((o) => String(o.id) === orgId);
    if (selectedOrg && selectedOrg.config?.billing?.products_pricing) {
      const pricingProductIds = selectedOrg.config.billing.products_pricing.map((p: any) => String(p.product_id));
      const filtered = allProducts.filter((p) => pricingProductIds.includes(String(p.id)));
      setAllowedProducts(filtered);

      // Se o produto selecionado atualmente não for "all" e não estiver nos permitidos, limpa
      if (productId && productId !== "all" && !pricingProductIds.includes(productId)) {
        setProductId("");
      }
    } else {
      setAllowedProducts([]);
      setProductId("");
    }
  }, [orgId, organizations, allProducts, productId]);

  // Sincronizar parâmetros de filtro com a URL
  useEffect(() => {
    const params: any = {};
    if (orgId) params.organization_id = orgId;
    if (productId) params.product_id = productId;
    if (referenceMonth) params.month = String(referenceMonth);
    if (referenceYear) params.year = String(referenceYear);

    setSearchParams(params, { replace: true });
  }, [orgId, productId, referenceMonth, referenceYear, setSearchParams]);

  // Gerar Relatório
  const handleGenerateReport = async () => {
    if (!orgId) {
      toast.warning("Selecione uma organização");
      return;
    }
    if (!productId) {
      toast.warning("Selecione um produto");
      return;
    }

    try {
      setGenerating(true);
      const data = await billingReportService.generate({
        organization_id: Number(orgId),
        product_id: productId,
        reference_month: referenceMonth,
        reference_year: referenceYear,
      });
      setReportData(data);
      toast.success("Relatório gerado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao gerar relatório");
      setReportData(null);
    } finally {
      setGenerating(false);
    }
  };

  // Limpar Filtros
  const handleResetFilters = () => {
    setOrgId("");
    setProductId("");
    setReferenceMonth(new Date().getMonth() + 1);
    setReferenceYear(new Date().getFullYear());
    setReportData(null);
  };

  // Auxiliar formatador de valores
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  // Auxiliar formatador de CPF/CNPJ
  const formatCpfCnpj = (value: string) => {
    if (!value) return "-";
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 11) {
      return cpfApplyMask(clean);
    }
    return cnpjApplyMask(clean);
  };

  // Exportar para Excel (.xlsx) seguindo o layout exato da planilha de referência
  const handleExportExcel = () => {
    if (!reportData) return;

    try {
      const { header, lines } = reportData;

      // Monta as linhas da matriz AOA (Array of Arrays)
      const aoaData = [
        ["Cliente", header.organization_name, "", "Vidas relacionadas", header.total_lives],
        ["Valor mensal por vida (R$)", header.monthly_value_per_life > 0 ? header.monthly_value_per_life : "Varia por produto", "", "Vidas com cobrança no ciclo", header.lives_with_billing],
        ["Início do ciclo", dataParaBR(header.cycle_start), "", "Vidas fora do ciclo", header.lives_outside_cycle],
        ["Fim do ciclo", dataParaBR(header.cycle_end), "", "Total a cobrar (R$)", header.total_to_charge],
        ["", "", "", "", ""],
        ["Dias do ciclo", header.cycle_days, "", "Base de cálculo", header.calculation_basis],
        ["", "", "", "", ""],
        [`COBRANÇA MENSAL ${header.organization_name.toUpperCase()} — CICLO ${dataParaBR(header.cycle_start)} A ${dataParaBR(header.cycle_end)}`],
        [""], // Espaço em branco
        [
          "Nome",
          "CPF/CNPJ",
          "Produto",
          "Início de Vigência",
          "Início do ciclo",
          "Fim do ciclo",
          "Início apurado no ciclo",
          "Fim apurado no ciclo",
          "Dias do ciclo",
          "Dias cobertos no ciclo",
          "Valor mensal (R$)",
          "Valor cobrado (R$)",
          "Observação"
        ]
      ];

      // Insere os dados dos clientes
      lines.forEach((line) => {
        aoaData.push([
          line.name,
          formatCpfCnpj(line.cpf),
          line.product_name,
          dataParaBR(line.validity_start),
          dataParaBR(line.cycle_start),
          dataParaBR(line.cycle_end),
          line.calculated_start ? dataParaBR(line.calculated_start) : "-",
          line.calculated_end ? dataParaBR(line.calculated_end) : "-",
          line.cycle_days,
          line.covered_days,
          line.monthly_value,
          line.charged_value,
          line.observation
        ]);
      });

      // Cria a planilha e adiciona mesclagens
      const ws = XLSX.utils.aoa_to_sheet(aoaData);
      
      // Mescla o título da cobrança mensal (A8 até M8)
      ws["!merges"] = [
        { s: { r: 7, c: 0 }, e: { r: 7, c: 12 } }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cobrança");

      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cobranca-${header.organization_name.toLowerCase().replace(/\s+/g, "-")}-${header.cycle_start}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Arquivo Excel exportado!");
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao exportar para Excel");
    }
  };

  // Exportar para PDF
  const handleExportPdf = () => {
    if (!reportData) return;

    try {
      const { header, lines } = reportData;
      const doc = new jsPDF({ orientation: "landscape" });

      doc.setFontSize(16);
      doc.text(`Cobrança Mensal - ${header.organization_name}`, 14, 15);
      
      doc.setFontSize(10);
      doc.text(`Produto: ${header.product_name}`, 14, 22);
      doc.text(`Ciclo: ${dataParaBR(header.cycle_start)} a ${dataParaBR(header.cycle_end)} (${header.cycle_days} dias)`, 14, 27);
      doc.text(`Vidas Relacionadas: ${header.total_lives} | Vidas com Cobrança: ${header.lives_with_billing} | Vidas Fora: ${header.lives_outside_cycle}`, 14, 32);
      doc.text(`Total a Cobrar: ${formatCurrency(header.total_to_charge)}`, 14, 37);
      doc.text(`Base de Cálculo: ${header.calculation_basis}`, 14, 42);

      const tableColumns = [
        "Nome",
        "CPF/CNPJ",
        "Produto",
        "Vigência",
        "Início Apurado",
        "Fim Apurado",
        "Dias Cobertos",
        "Mensal",
        "Cobrado",
        "Obs"
      ];

      const tableRows = lines.map((l) => [
        l.name,
        formatCpfCnpj(l.cpf),
        l.product_name,
        dataParaBR(l.validity_start),
        l.calculated_start ? dataParaBR(l.calculated_start) : "-",
        l.calculated_end ? dataParaBR(l.calculated_end) : "-",
        l.covered_days,
        formatCurrency(l.monthly_value),
        formatCurrency(l.charged_value),
        l.observation
      ]);

      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 48,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo
      });

      doc.save(`cobranca-${header.organization_name.toLowerCase().replace(/\s+/g, "-")}-${header.cycle_start}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao exportar PDF");
    }
  };

  const meses = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Receipt className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cobrança Mensal por Organização</h1>
          <p className="text-muted-foreground">
            Gere e exporte relatórios de cobrança proporcionais de vidas e planos por organização.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-indigo-100 shadow-sm bg-gradient-to-r from-slate-50 to-indigo-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-md font-medium flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" /> Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingFilters ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span className="text-sm text-muted-foreground">Carregando configurações de organizações...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Organização</label>
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={String(org.id)}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Produto</label>
                <Select value={productId} onValueChange={setProductId} disabled={!orgId || allowedProducts.length === 0}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={orgId ? "Selecione..." : "Aguardando Organização..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedProducts.length > 0 && (
                      <SelectItem value="all">Todos os produtos</SelectItem>
                    )}
                    {allowedProducts.map((prod) => (
                      <SelectItem key={prod.id} value={String(prod.id)}>
                        {prod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Mês</label>
                  <Select value={String(referenceMonth)} onValueChange={(val) => setReferenceMonth(Number(val))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Ano</label>
                  <Input
                    type="number"
                    value={referenceYear}
                    onChange={(e) => setReferenceYear(Number(e.target.value))}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateReport} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...
                    </>
                  ) : (
                    "Gerar Relatório"
                  )}
                </Button>
                <Button variant="outline" onClick={handleResetFilters} title="Limpar Filtros">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo do Relatório */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-indigo-100 shadow-sm">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Vigência do Ciclo</span>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">
                  {dataParaBR(reportData.header.cycle_start)} a {dataParaBR(reportData.header.cycle_end)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de {reportData.header.cycle_days} dias de ciclo
                </p>
              </CardContent>
            </Card>

            <Card className="border-indigo-100 shadow-sm">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Vidas Relacionadas</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{reportData.header.total_lives}</p>
                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                  <span>Com cobrança: <strong className="text-slate-700">{reportData.header.lives_with_billing}</strong></span>
                  <span>|</span>
                  <span>Fora do ciclo: <strong className="text-slate-700">{reportData.header.lives_outside_cycle}</strong></span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-indigo-100 shadow-sm">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Preço por Vida</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-indigo-600">
                  {reportData.header.monthly_value_per_life > 0 
                    ? formatCurrency(reportData.header.monthly_value_per_life)
                    : "Múltiplos"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {reportData.header.monthly_value_per_life > 0 
                    ? "Mensal por vida/plano ativa"
                    : "Valores variam por produto"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-indigo-600 text-white shadow-md border-indigo-700">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-indigo-200 uppercase">Total a Cobrar</span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black">{formatCurrency(reportData.header.total_to_charge)}</p>
                <p className="text-xs text-indigo-100 mt-1 line-clamp-1" title={reportData.header.calculation_basis}>
                  {reportData.header.calculation_basis}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Detalhada */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-bold">Listagem Detalhada de Vidas</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exportar Excel
                </Button>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleExportPdf}>
                  <FileDown className="h-4 w-4" /> Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Início Vigência</TableHead>
                      <TableHead>Início Apurado</TableHead>
                      <TableHead>Fim Apurado</TableHead>
                      <TableHead className="text-center">Dias Cobertos</TableHead>
                      <TableHead className="text-right">Mensal (R$)</TableHead>
                      <TableHead className="text-right">Cobrado (R$)</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.lines.map((line, idx) => (
                      <TableRow key={idx} className={line.covered_days === 0 ? "bg-slate-50 text-slate-400" : ""}>
                        <TableCell className="font-semibold text-slate-800">{line.name}</TableCell>
                        <TableCell>{formatCpfCnpj(line.cpf)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal text-slate-600 bg-slate-50 border-slate-200">
                            {line.product_name}
                          </Badge>
                        </TableCell>
                        <TableCell>{dataParaBR(line.validity_start)}</TableCell>
                        <TableCell>{line.calculated_start ? dataParaBR(line.calculated_start) : "-"}</TableCell>
                        <TableCell>{line.calculated_end ? dataParaBR(line.calculated_end) : "-"}</TableCell>
                        <TableCell className="text-center">
                          {line.covered_days > 0 ? (
                            <Badge variant={line.covered_days === line.cycle_days ? "default" : "secondary"}>
                              {line.covered_days} dias
                            </Badge>
                          ) : (
                            <Badge variant="destructive">0 dias</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(line.monthly_value)}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          {formatCurrency(line.charged_value)}
                        </TableCell>
                        <TableCell className="text-xs italic text-slate-500 max-w-[200px] truncate">
                          {line.observation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
