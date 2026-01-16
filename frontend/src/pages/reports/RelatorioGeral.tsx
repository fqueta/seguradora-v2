import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { contractsService } from "@/services/contractsService";
import { usersService } from "@/services/usersService";
import type { ContractRecord, ContractsListParams } from "@/types/contracts";
import type { UserRecord } from "@/types/users";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileDown, FileSpreadsheet, Filter, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type PeriodField = "inicio" | "fim";

export default function RelatorioGeral() {
  const [periodField, setPeriodField] = useState<PeriodField>("inicio");
  const [vigenciaInicio, setVigenciaInicio] = useState<string>("");
  const [vigenciaFim, setVigenciaFim] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);
  const [items, setItems] = useState<ContractRecord[]>([]);
  const [owners, setOwners] = useState<UserRecord[]>([]);

  useEffect(() => {
    usersService
      .listUsers({ per_page: 100 })
      .then((res) => setOwners(res.data))
      .catch(() => {});
  }, []);

  const filtersMemo = useMemo(() => {
    const params: ContractsListParams = {
      page,
      per_page: perPage,
    };
    if (status) params.status = status;
    if (ownerId) params.owner_id = ownerId;
    if (vigenciaInicio) params.vigencia_inicio = vigenciaInicio;
    if (vigenciaFim) params.vigencia_fim = vigenciaFim;
    return params;
  }, [page, perPage, status, ownerId, vigenciaInicio, vigenciaFim]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await contractsService.listContracts(filtersMemo);
      setItems(res.data);
      setTotal(res.total || res.data.length);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filtersMemo]);

  const handleFilter = () => {
    setPage(1);
    fetchData();
  };

  const handleClear = () => {
    setPeriodField("inicio");
    setVigenciaInicio("");
    setVigenciaFim("");
    setStatus("");
    setOwnerId("");
    setPage(1);
  };

  const headerColumns = [
    "Data de Início",
    "Data de Fim",
    "Cliente",
    "Autor",
    "Status",
  ];

  const rowsForExport = items.map((c) => ({
    inicio: c.start_date || "",
    fim: c.end_date || "",
    cliente: c.client?.name || c.client?.full_name || "",
    autor: c.owner?.name || c.owner?.full_name || "",
    status: c.status || "",
  }));

  const exportExcel = () => {
    try {
      const wsData = [headerColumns, ...rowsForExport.map((r) => [r.inicio, r.fim, r.cliente, r.autor, r.status])];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatório");
      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "relatorio-geral.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel gerado");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar Excel");
    }
  };

  const exportPdf = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.text("Relatórios: Usuários com Contratos", 14, 16);
      autoTable(doc, {
        head: [headerColumns],
        body: rowsForExport.map((r) => [r.inicio, r.fim, r.cliente, r.autor, r.status]),
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 101, 216] },
      });
      doc.save("relatorio-geral.pdf");
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar PDF");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Relatórios: Usuários com Contratos</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </Button>
          <Button onClick={exportPdf} className="gap-2">
            <FileDown className="w-4 h-4" />
            Gerar PDF
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-sm text-muted-foreground">Campo do período</label>
            <Select value={periodField} onValueChange={(v) => setPeriodField(v as PeriodField)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inicio">Data de início</SelectItem>
                <SelectItem value="fim">Data final</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Período inicial</label>
            <Input type="date" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Período final</label>
            <Input type="date" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Status do contrato</label>
            <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Autor do contrato</label>
            <Select value={ownerId} onValueChange={(v) => setOwnerId(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {owners.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name || u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="default" onClick={handleFilter} className="gap-2">
            <Filter className="w-4 h-4" />
            Filtrar
          </Button>
          <Button variant="outline" onClick={handleClear} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Limpar
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data de início</TableHead>
                <TableHead>Data de fim</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Nenhum registro
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.start_date || "-"}</TableCell>
                    <TableCell>{c.end_date || "-"}</TableCell>
                    <TableCell>{c.client?.name || c.client?.full_name || "-"}</TableCell>
                    <TableCell>{c.owner?.name || c.owner?.full_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "approved" ? "default" : c.status === "cancelled" ? "destructive" : "secondary"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between p-3">
          <div className="text-sm text-muted-foreground">
            Registros: {items.length} de {total} (Página {page} de {totalPages})
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
