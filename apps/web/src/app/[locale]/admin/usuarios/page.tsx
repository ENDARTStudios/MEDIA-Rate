"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/http";

type PlanoAdmin = "FREE" | "PLUS" | "PREMIUM";

interface UsuarioAdmin {
  id: string;
  nome: string | null;
  email: string;
  plano: PlanoAdmin;
  origem: string;
  banido: boolean;
  criado_em: string;
}

interface PaginaUsuarios {
  items: UsuarioAdmin[];
  total: number;
  page: number;
  pageSize: number;
}

const PLANOS: PlanoAdmin[] = ["FREE", "PLUS", "PREMIUM"];

/**
 * Onda 1 admin (P0) — gestão de usuários: busca por nome/email, filtro por
 * plano, alteração de plano (exceção MANUAL) e ban/desban com motivo.
 * Rotas @Roles("ADMIN") no backend — 401/403 vira erro na página.
 */
export default function AdminUsuariosPage() {
  const [busca, setBusca] = useState("");
  const [planoFiltro, setPlanoFiltro] = useState<PlanoAdmin | "">("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PaginaUsuarios | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (busca.trim()) qs.set("q", busca.trim());
      if (planoFiltro) qs.set("plano", planoFiltro);
      const d = await api.get<PaginaUsuarios>(`/api/v1/admin/usuarios?${qs.toString()}`);
      setData(d);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar usuários.");
    } finally {
      setCarregando(false);
    }
  }, [page, busca, planoFiltro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function alterarPlano(id: string, plano: PlanoAdmin) {
    try {
      await api.patch(`/api/v1/admin/usuarios/${id}/plano`, { plano });
      setErro(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao alterar plano.");
    }
  }

  async function banir(u: UsuarioAdmin) {
    const motivo = window.prompt(`Motivo do ban de ${u.email}?`);
    if (!motivo || !motivo.trim()) return;
    try {
      await api.post(`/api/v1/admin/usuarios/${u.id}/ban`, { motivo: motivo.trim() });
      setErro(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao banir.");
    }
  }

  async function desbanir(u: UsuarioAdmin) {
    try {
      await api.post(`/api/v1/admin/usuarios/${u.id}/desbanir`);
      setErro(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao desbanir.");
    }
  }

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Gestão de usuários
      </h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por nome ou email…"
          data-testid="admin-usuarios-busca"
          aria-label="Buscar usuários por nome ou email"
          className="flex-1 min-w-[14rem] rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
        />
        <select
          value={planoFiltro}
          onChange={(e) => {
            setPlanoFiltro(e.target.value as PlanoAdmin | "");
            setPage(0);
          }}
          data-testid="admin-usuarios-filtro-plano"
          aria-label="Filtrar por plano"
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Todos os planos</option>
          {PLANOS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {erro && (
        <p className="mb-4 text-sm text-red-600" role="alert" data-testid="admin-usuarios-erro">
          {erro}
        </p>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full" data-testid="admin-usuarios-tabela">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Usuário
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Plano
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {(data?.items ?? []).map((u) => (
              <tr key={u.id} data-testid="admin-usuarios-linha">
                <td className="px-4 py-3 text-sm">
                  <span className="font-medium">{u.nome ?? "—"}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{u.email}</span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.plano}
                    onChange={(e) => void alterarPlano(u.id, e.target.value as PlanoAdmin)}
                    data-testid={`admin-usuarios-plano-${u.id}`}
                    aria-label={`Plano de ${u.email}`}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1 text-xs"
                  >
                    {PLANOS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                        {u.origem === "MANUAL" && u.plano === p ? " (manual)" : ""}
                      </option>
                    ))}
                  </select>
                  <span className="ml-1 text-[10px] text-gray-400">{u.origem}</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {u.banido ? (
                    <span className="text-red-600 font-medium" data-testid="admin-usuarios-banido">
                      Banido
                    </span>
                  ) : (
                    <span className="text-green-600">Ativo</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.banido ? (
                    <button
                      type="button"
                      onClick={() => void desbanir(u)}
                      data-testid={`admin-usuarios-desbanir-${u.id}`}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Desbanir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void banir(u)}
                      data-testid={`admin-usuarios-banir-${u.id}`}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Banir
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500" data-testid="admin-usuarios-total">
          {data ? `${data.total} usuários` : ""}
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
