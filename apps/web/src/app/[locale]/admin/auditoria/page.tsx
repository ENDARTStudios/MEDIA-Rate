"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/http";

interface AuditoriaItem {
  entidade: string;
  entidadeId: string;
  acao: string;
  usuarioId: string | null;
  ip: string | null;
  criado_em: string;
}

interface PaginaAuditoria {
  items: AuditoriaItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Onda 5 admin (P2) — consulta do log de auditoria com filtros
 * (usuário/ação/período) e paginação. Hashes da cadeia nunca expostos.
 * Rotas @Roles("ADMIN") no backend.
 */
export default function AdminAuditoriaPage() {
  const [usuarioId, setUsuarioId] = useState("");
  const [acao, setAcao] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PaginaAuditoria | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (usuarioId.trim()) qs.set("usuarioId", usuarioId.trim());
      if (acao.trim()) qs.set("acao", acao.trim());
      if (de) qs.set("de", de);
      if (ate) qs.set("ate", ate);
      const d = await api.get<PaginaAuditoria>(`/api/v1/admin/auditoria?${qs.toString()}`);
      setData(d);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar auditoria.");
    } finally {
      setCarregando(false);
    }
  }, [page, usuarioId, acao, de, ate]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-fg-primary">Log de auditoria</h1>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={usuarioId}
          onChange={(e) => {
            setUsuarioId(e.target.value);
            setPage(0);
          }}
          placeholder="UUID do usuário"
          data-testid="admin-auditoria-usuario"
          aria-label="Filtrar por usuário (UUID)"
          className="rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm font-mono"
        />
        <input
          value={acao}
          onChange={(e) => {
            setAcao(e.target.value);
            setPage(0);
          }}
          placeholder="Ação (ex.: ADMIN_USUARIO_BANIDO)"
          data-testid="admin-auditoria-acao"
          aria-label="Filtrar por ação"
          className="rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={de}
          onChange={(e) => {
            setDe(e.target.value);
            setPage(0);
          }}
          data-testid="admin-auditoria-de"
          aria-label="Data inicial"
          className="rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={ate}
          onChange={(e) => {
            setAte(e.target.value);
            setPage(0);
          }}
          data-testid="admin-auditoria-ate"
          aria-label="Data final"
          className="rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
        />
      </div>

      {erro && (
        <p className="mb-4 text-sm text-score-low" role="alert" data-testid="admin-auditoria-erro">
          {erro}
        </p>
      )}

      <div className="bg-surface-card rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full" data-testid="admin-auditoria-tabela">
          <thead>
            <tr className="border-b border-surface-border">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
              >
                Quando
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
              >
                Ação
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
              >
                Entidade
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
              >
                Usuário
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
              >
                IP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {(data?.items ?? []).map((item, idx) => (
              <tr key={`${item.entidadeId}-${idx}`} data-testid="admin-auditoria-linha">
                <td className="px-4 py-2 text-xs text-fg-secondary">
                  {new Date(item.criado_em).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-2 text-sm font-medium">{item.acao}</td>
                <td className="px-4 py-2 text-xs">
                  {item.entidade}
                  <span className="block text-[10px] text-fg-secondary font-mono">
                    {item.entidadeId}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs font-mono">
                  {item.usuarioId?.slice(0, 8) ?? "—"}
                </td>
                <td className="px-4 py-2 text-xs text-fg-secondary">{item.ip ?? "—"}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-fg-secondary">
                  Nenhum registro para os filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-fg-secondary" data-testid="admin-auditoria-total">
          {data ? `${data.total} registros` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || carregando}
            className="rounded-lg border border-surface-border px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-fg-secondary">
            Página {page + 1} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((p) => (data && (p + 1) * data.pageSize < data.total ? p + 1 : p))
            }
            disabled={!data || (page + 1) * data.pageSize >= data.total || carregando}
            className="rounded-lg border border-surface-border px-3 py-1.5 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
