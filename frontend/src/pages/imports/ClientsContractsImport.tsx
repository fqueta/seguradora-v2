import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsList } from "@/hooks/products";
import { toast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/qlib";

type UploadResponse = {
  exec: boolean;
  message: string;
  data: {
    session_token: string;
    supplier: string | null;
    product_id: string;
    headers: string[];
    required_fields: string[];
    rows_preview: any[];
  };
};

type PreviewResponse = {
  exec: boolean;
  message: string;
  data: {
    supplier: string | null;
    product_id: string;
    headers: string[];
    rows: Array<{
      index: number;
      row: Record<string, any>;
      validations: {
        cpf_valid: boolean;
        email_present: boolean;
        celular_present: boolean;
        client_exists: boolean;
        existing_contract: boolean;
      };
      lsx_payload?: Record<string, any> | null;
      messages?: string[];
    }>;
  };
};

type CommitResponse = {
  exec: boolean;
  message: string;
  data: Array<{
    index: number;
    exec: boolean;
    mens: string;
    client_id?: string;
    contract_id?: string;
  }>;
};

/**
 * ClientsContractsImport
 * pt-BR: Wizard de importação (2 etapas) para clientes/contratos a partir de Excel.
 * en-US: Two-step import wizard for clients/contracts from Excel.
 */
const ClientsContractsImport: React.FC = () => {
  const { token, user } = useAuth();
  const [productId, setProductId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse["data"] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [isUploading, setUploading] = useState(false);
  const [isLoadingPreview, setLoadingPreview] = useState(false);
  const [isCommitting, setCommitting] = useState(false);
  const [commitResults, setCommitResults] = useState<CommitResponse["data"] | null>(null);
  const successCount = useMemo(() => (commitResults ? commitResults.filter((r) => r.exec).length : 0), [commitResults]);
  const failCount = useMemo(() => (commitResults ? commitResults.filter((r) => !r.exec).length : 0), [commitResults]);
  function exportCsv() {
    if (!commitResults || commitResults.length === 0) return;
    const headers = ["index", "status", "mens", "client_id", "contract_id"];
    const lines = commitResults.map((r) => {
      const row = [
        String(r.index),
        r.exec ? "sucesso" : "falha",
        (r.mens || "").replace(/\r?\n/g, " ").replace(/"/g, '""'),
        r.client_id ? String(r.client_id) : "",
        r.contract_id ? String(r.contract_id) : "",
      ];
      return row.map((c) => `"${c}"`).join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const { data: productsData } = useProductsList({ per_page: 100 });
  const products = useMemo(() => productsData?.data || [], [productsData]);

  /**
   * handleUpload
   * pt-BR: Envia product_id e arquivo para criar sessão de importação.
   * en-US: Sends product_id and file to create import session.
   */
  async function handleUpload() {
    if (!productId || !file) {
      toast({ title: "Selecione produto e arquivo", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("product_id", productId);
      form.append("file", file);
      const resp = await fetch(`${getApiUrl()}/imports/clients-contracts/upload`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
        },
        body: form,
      });
      const json: UploadResponse = await resp.json();
      if (!resp.ok || !json.exec) {
        throw new Error(json?.message || "Falha no upload");
      }
      setSessionToken(json.data.session_token);
      toast({ title: "Upload OK", description: "Sessão criada. Vá para a Etapa 2." });
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e?.message || "Falha desconhecida", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  /**
   * loadPreview
   * pt-BR: Carrega preview detalhada da sessão (validações e payload LSX).
   * en-US: Loads detailed session preview (validations and LSX payload).
   */
  async function loadPreview() {
    if (!sessionToken) {
      toast({ title: "Sessão não encontrada", variant: "destructive" });
      return;
    }
    setLoadingPreview(true);
    try {
      const resp = await fetch(`${getApiUrl()}/imports/clients-contracts/${sessionToken}/preview`, {
        method: "GET",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
        },
      });
      const json: PreviewResponse = await resp.json();
      if (!resp.ok || !json.exec) {
        throw new Error(json?.message || "Falha na pré-visualização");
      }
      setPreview(json.data);
      setSelected([]);
    } catch (e: any) {
      toast({ title: "Erro na prévia", description: e?.message || "Falha desconhecida", variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  }

  /**
   * handleCommit
   * pt-BR: Envia índices selecionados para criar clientes/contratos e integrar LSX.
   * en-US: Sends selected indices to create clients/contracts and integrate LSX.
   */
  async function handleCommit() {
    if (!sessionToken || selected.length === 0) {
      toast({ title: "Selecione linhas válidas para importar", variant: "destructive" });
      return;
    }
    setCommitting(true);
    try {
      const resp = await fetch(`${getApiUrl()}/imports/clients-contracts/${sessionToken}/commit`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selected }),
      });
      const json: CommitResponse = await resp.json();
      if (!resp.ok || !json.exec) {
        throw new Error(json?.message || "Falha no commit");
      }
      const okCount = json.data.filter((r) => r.exec).length;
      toast({ title: "Importação concluída", description: `${okCount} registros importados com sucesso.` });
      setCommitResults(json.data);
      // Atualiza preview para refletir resultados
      loadPreview().catch(() => {});
    } catch (e: any) {
      toast({ title: "Erro no commit", description: e?.message || "Falha desconhecida", variant: "destructive" });
    } finally {
      setCommitting(false);
    }
  }

  /**
   * toggleSelect
   * pt-BR: Alterna seleção de uma linha pelo índice.
   * en-US: Toggles selection of a row by index.
   */
  function toggleSelect(idx: number) {
    setSelected((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  }
  function selectAll() {
    if (!preview) return;
    setSelected(preview.rows.map((r) => r.index));
  }
  function clearSelection() {
    setSelected([]);
  }
  function toggleSelectAll() {
    if (!preview) return;
    if (selected.length === preview.rows.length) {
      clearSelection();
    } else {
      selectAll();
    }
  }
  function getRowSeverity(r: PreviewResponse["data"]["rows"][number]) {
    const msgs = r.messages || [];
    if (!r.validations.cpf_valid || msgs.includes("CPF inválido") || msgs.includes("CPF ausente") || msgs.includes("Nome ausente")) {
      return "error";
    }
    if (msgs.includes("Contrato já existente para o produto") || msgs.includes("Email ausente") || msgs.includes("Celular ausente")) {
      return "warn";
    }
    return "ok";
  }

  return (
    <div className="p-4 space-y-6">
      {user && Number(user.permission_id) >= 3 && (
        <div className="p-4 border rounded bg-yellow-50 text-yellow-800">
          Esta área de importação está disponível apenas para usuários com permissão administrativa (permission_id &lt; 3).
        </div>
      )}
      {user && Number(user.permission_id) >= 3 ? null : (
      <>
      <h1 className="text-2xl font-semibold">Importar Clientes/Contratos (Excel)</h1>

      {/* Etapa 1: Produto + Upload */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Etapa 1 — Configuração</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Produto</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Selecione um produto</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.post_title || p.title || p.name || `#${p.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Arquivo Excel</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="w-full border rounded px-3 py-2"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex items-end">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={isUploading}
              onClick={handleUpload}
            >
              {isUploading ? "Enviando..." : "Criar Sessão"}
            </button>
          </div>
        </div>
        {sessionToken && (
          <div className="text-sm text-gray-600">Sessão criada: {sessionToken}</div>
        )}
      </section>

      {/* Etapa 2: Pré-visualização e Commit */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Etapa 2 — Pré-visualização e Importação</h2>
        <div className="flex gap-2">
          <button
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
            disabled={!sessionToken || isLoadingPreview}
            onClick={loadPreview}
          >
            {isLoadingPreview ? "Carregando..." : "Carregar Prévia"}
          </button>
          {preview && (
            <>
              <button
                className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300"
                onClick={selectAll}
              >
                Selecionar todos
              </button>
              <button
                className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300"
                onClick={clearSelection}
              >
                Limpar seleção
              </button>
            </>
          )}
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            disabled={!preview || selected.length === 0 || isCommitting}
            onClick={handleCommit}
          >
            {isCommitting ? "Importando..." : `Importar (${selected.length})`}
          </button>
        </div>
        {!preview && <p className="text-sm text-gray-600">Carregue a prévia para visualizar os registros.</p>}
        {preview && (
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={preview && preview.rows.length > 0 && selected.length === preview.rows.length}
                        onChange={toggleSelectAll}
                      />
                      <span>Selecionar</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left">#</th>
                  {preview.headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                  <th className="px-3 py-2 text-left">CPF válido</th>
                  <th className="px-3 py-2 text-left">Cliente existe</th>
                  <th className="px-3 py-2 text-left">Contrato existente</th>
                  <th className="px-3 py-2 text-left">Motivos</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr
                    key={r.index}
                    className={
                      "border-t " +
                      (getRowSeverity(r) === "error"
                        ? "bg-red-50"
                        : getRowSeverity(r) === "warn"
                        ? "bg-yellow-50"
                        : "")
                    }
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(r.index)}
                        onChange={() => toggleSelect(r.index)}
                      />
                    </td>
                    <td className="px-3 py-2">{r.index}</td>
                    {preview.headers.map((h) => (
                      <td key={h} className="px-3 py-2">{String(r.row[h] ?? "")}</td>
                    ))}
                    <td className="px-3 py-2">{r.validations.cpf_valid ? "Sim" : "Não"}</td>
                    <td className="px-3 py-2">{r.validations.client_exists ? "Sim" : "Não"}</td>
                    <td className="px-3 py-2">{r.validations.existing_contract ? "Sim" : "Não"}</td>
                    <td className="px-3 py-2">
                      {r.messages && r.messages.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.messages.map((m, i) => (
                            <span key={i} className="px-2 py-1 rounded bg-gray-100 text-gray-800">{m}</span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {commitResults && (
          <div className="mt-4 border rounded">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-4">
                <h3 className="font-medium">Resultados da Importação</h3>
                <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-800">Sucesso: {successCount}</span>
                <span className="text-sm px-2 py-1 rounded bg-red-100 text-red-800">Falha: {failCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={exportCsv}
                >
                  Exportar CSV
                </button>
                <button
                  className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => setCommitResults(null)}
                >
                  Limpar resultados
                </button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Mensagem</th>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Contrato</th>
                  </tr>
                </thead>
                <tbody>
                  {commitResults.map((r) => (
                    <tr key={r.index} className="border-t">
                      <td className="px-3 py-2">{r.index}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded ${r.exec ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {r.exec ? 'Sucesso' : 'Falha'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{r.mens}</td>
                      <td className="px-3 py-2">
                        {r.client_id ? (
                          <a
                            className="text-blue-600 hover:underline"
                            href={`/admin/clients/${r.client_id}/view`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver cliente
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.contract_id ? (
                          <a
                            className="text-blue-600 hover:underline"
                            href={`/admin/contracts/${r.contract_id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver contrato
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      </>
      )}
    </div>
  );
};

export default ClientsContractsImport;
