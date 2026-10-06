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
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Log de auditoria</h1>

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
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm font-mono"
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
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
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
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
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
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      {erro && (
        <p className="mb-4 text-sm text-red-600" role="alert" data-testid="admin-auditoria-erro">
          {erro}
        </p>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full" data-testid="admin-auditoria-tabela">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Quando
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Ação
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Entidade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Usuário
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                IP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {(data?.items ?? []).map((item, idx) => (
              <tr key={`${item.entidadeId}-${idx}`} data-testid="admin-auditoria-linha">
                <td className="px-4 py-2 text-xs text-gray-500">
                  {new Date(item.criado_em).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-2 text-sm font-medium">{item.acao}</td>
                <td className="px-4 py-2 text-xs">
                  {item.entidade}
                  <span className="block text-[10px] text-gray-400 font-mono">
                    {item.entidadeId}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs font-mono">
                  {item.usuarioId?.slice(0, 8) ?? "—"}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{item.ip ?? "—"}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  Nenhum registro para os filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500" data-testid="admin-auditoria-total">
          {data ? `${data.total} registros` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || carregando}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-500">
            Página {page + 1} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((p) => (data && (p + 1) * data.pageSize < data.total ? p + 1 : p))
            }
            disabled={!data || (page + 1) * data.pageSize >= data.total || carregando}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
