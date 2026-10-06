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

interface AtividadeInteracao {
  id: string;
  status: string;
  reacao: string | null;
  atualizado_em: string;
  midia: { id: string; titulo: string | null; tipo: string };
}

interface Atividade {
  usuario: { id: string; email: string };
  interacoes: AtividadeInteracao[];
  watchlist: { id: string; midia_id: string; coluna: string }[];
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
  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const [carregandoAtividade, setCarregandoAtividade] = useState(false);

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

  async function abrirAtividade(u: UsuarioAdmin) {
    setCarregandoAtividade(true);
    setErro(null);
    try {
      const d = await api.get<Atividade>(`/api/v1/admin/usuarios/${u.id}/atividade`);
      setAtividade(d);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar atividade.");
    } finally {
      setCarregandoAtividade(false);
    }
  }

  async function removerInteracao(usuarioId: string, midiaId: string) {
    const motivo = window.prompt("Motivo da remoção da interação?");
    if (!motivo || !motivo.trim()) return;
    try {
      await api.delete(`/api/v1/admin/usuarios/${usuarioId}/interacoes/${midiaId}`, {
        body: { motivo: motivo.trim() },
      });
      const d = await api.get<Atividade>(`/api/v1/admin/usuarios/${usuarioId}/atividade`);
      setAtividade(d);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover interação.");
    }
  }

  async function removerWatchlist(usuarioId: string, entryId: string) {
    const motivo = window.prompt("Motivo da remoção da watchlist?");
    if (!motivo || !motivo.trim()) return;
    try {
      await api.delete(`/api/v1/admin/usuarios/${usuarioId}/watchlist/${entryId}`, {
        body: { motivo: motivo.trim() },
      });
      const d = await api.get<Atividade>(`/api/v1/admin/usuarios/${usuarioId}/atividade`);
      setAtividade(d);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover da watchlist.");
    }
  }

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Gestão de usuários
      </h1>

      <p className="mb-4">
        <a
          href="/admin/catalogo"
          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Catálogo →
        </a>
      </p>

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
                  <button
                    type="button"
                    onClick={() => void abrirAtividade(u)}
                    data-testid={`admin-usuarios-atividade-${u.id}`}
                    className="ml-2 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Atividade
                  </button>
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

      {carregandoAtividade && (
        <p className="text-sm text-gray-500" data-testid="admin-atividade-carregando">
          Carregando atividade…
        </p>
      )}

      {atividade && (
        <section
          aria-labelledby="atividade-title"
          className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          data-testid="admin-atividade-painel"
        >
          <div className="flex items-center justify-between">
            <h2
              id="atividade-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Atividade de {atividade.usuario.email}
            </h2>
            <button
              type="button"
              onClick={() => setAtividade(null)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs"
            >
              Fechar
            </button>
          </div>

          <h3 className="mt-3 text-sm font-semibold">Interações ({atividade.interacoes.length})</h3>
          <ul className="mt-1 divide-y divide-gray-200 dark:divide-gray-700">
            {atividade.interacoes.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {i.midia.titulo ?? i.midia.id}{" "}
                  <span className="text-xs text-gray-400">{i.midia.tipo}</span>
                </span>
                <span className="text-xs text-gray-500">{i.status}</span>
                <span className="text-xs text-gray-500">{i.reacao ?? "—"}</span>
                <button
                  type="button"
                  onClick={() => void removerInteracao(atividade.usuario.id, i.midia.id)}
                  data-testid={`admin-atividade-remover-${i.midia.id}`}
                  className="shrink-0 rounded-lg border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Remover
                </button>
              </li>
            ))}
            {atividade.interacoes.length === 0 && (
              <li className="py-2 text-xs text-gray-400">Nenhuma interação.</li>
            )}
          </ul>

          <h3 className="mt-4 text-sm font-semibold">Watchlist ({atividade.watchlist.length})</h3>
          <ul className="mt-1 divide-y divide-gray-200 dark:divide-gray-700">
            {atividade.watchlist.map((w) => (
              <li key={w.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{w.midia_id}</span>
                <span className="text-xs text-gray-500">{w.coluna}</span>
                <button
                  type="button"
                  onClick={() => void removerWatchlist(atividade.usuario.id, w.id)}
                  data-testid={`admin-watchlist-remover-${w.id}`}
                  className="shrink-0 rounded-lg border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Remover
                </button>
              </li>
            ))}
            {atividade.watchlist.length === 0 && (
              <li className="py-2 text-xs text-gray-400">Watchlist vazia.</li>
            )}
          </ul>
        </section>
      )}

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
