"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/http";
import { comStepUp } from "@/lib/admin-stepup-client";

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

/** UAT-46 — registro público de patrocínios (mesma forma da API/lib). */
interface PatrocinioAdmin {
  id: string;
  patrocinador: string;
  secao: string;
  rotulo: string;
  desde: string;
}

const PLANOS: PlanoAdmin[] = ["FREE", "PLUS", "PREMIUM"];

const hojeISO = () => new Date().toISOString().slice(0, 10);

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
  // UAT-46: registro público de patrocínios.
  const [patrocinios, setPatrocinios] = useState<PatrocinioAdmin[] | null>(null);
  const [patrocinarPara, setPatrocinarPara] = useState<UsuarioAdmin | null>(null);
  const [patSecao, setPatSecao] = useState("");
  const [patRotulo, setPatRotulo] = useState("");
  const [patDesde, setPatDesde] = useState(hojeISO());

  const carregarPatrocinios = useCallback(async () => {
    try {
      const lista = await api.get<PatrocinioAdmin[]>("/api/v1/patrocinios");
      // Resposta inesperada (ex.: HTML de erro) não pode derrubar a página.
      setPatrocinios(Array.isArray(lista) ? lista : []);
    } catch {
      setPatrocinios([]);
    }
  }, []);

  useEffect(() => {
    void carregarPatrocinios();
  }, [carregarPatrocinios]);

  async function registrarPatrocinio() {
    if (!patrocinarPara) return;
    if (!patSecao.trim() || !patRotulo.trim()) {
      setErro("Seção e rótulo são obrigatórios no registro de patrocínio.");
      return;
    }
    try {
      await comStepUp(() =>
        api.post("/api/v1/admin/patrocinios", {
          usuario_id: patrocinarPara.id,
          // Nome público: o do usuário (autorização por escrito rege o que entra).
          patrocinador: patrocinarPara.nome?.trim() || patrocinarPara.email,
          secao: patSecao.trim(),
          rotulo: patRotulo.trim(),
          desde: patDesde,
        }),
      );
      setPatrocinarPara(null);
      setPatSecao("");
      setPatRotulo("");
      setPatDesde(hojeISO());
      setErro(null);
      await carregarPatrocinios();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao registrar patrocínio.");
    }
  }

  async function removerPatrocinio(id: string) {
    try {
      await comStepUp(() => api.delete(`/api/v1/admin/patrocinios/${id}`));
      setErro(null);
      await carregarPatrocinios();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover patrocínio.");
    }
  }

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
      await comStepUp(() => api.patch(`/api/v1/admin/usuarios/${id}/plano`, { plano }));
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
      await comStepUp(() =>
        api.post(`/api/v1/admin/usuarios/${u.id}/ban`, { motivo: motivo.trim() }),
      );
      setErro(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao banir.");
    }
  }

  async function desbanir(u: UsuarioAdmin) {
    try {
      await comStepUp(() => api.post(`/api/v1/admin/usuarios/${u.id}/desbanir`));
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
      await comStepUp(() =>
        api.delete(`/api/v1/admin/usuarios/${usuarioId}/interacoes/${midiaId}`, {
          body: { motivo: motivo.trim() },
        }),
      );
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
      await comStepUp(() =>
        api.delete(`/api/v1/admin/usuarios/${usuarioId}/watchlist/${entryId}`, {
          body: { motivo: motivo.trim() },
        }),
      );
      const d = await api.get<Atividade>(`/api/v1/admin/usuarios/${usuarioId}/atividade`);
      setAtividade(d);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover da watchlist.");
    }
  }

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6 text-fg-primary">Gestão de usuários</h1>

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
          className="flex-1 min-w-[14rem] rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
        />
        <select
          value={planoFiltro}
          onChange={(e) => {
            setPlanoFiltro(e.target.value as PlanoAdmin | "");
            setPage(0);
          }}
          data-testid="admin-usuarios-filtro-plano"
          aria-label="Filtrar por plano"
          className="rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
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
        <p className="mb-4 text-sm text-score-low" role="alert" data-testid="admin-usuarios-erro">
          {erro}
        </p>
      )}

      <div className="bg-surface-card rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full" data-testid="admin-usuarios-tabela">
          <thead>
            <tr className="border-b border-surface-border">
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
                Plano
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-fg-secondary uppercase"
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {(data?.items ?? []).map((u) => (
              <tr key={u.id} data-testid="admin-usuarios-linha">
                <td className="px-4 py-3 text-sm">
                  <span className="font-medium">{u.nome ?? "—"}</span>
                  <span className="block text-xs text-fg-secondary">{u.email}</span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.plano}
                    onChange={(e) => void alterarPlano(u.id, e.target.value as PlanoAdmin)}
                    data-testid={`admin-usuarios-plano-${u.id}`}
                    aria-label={`Plano de ${u.email}`}
                    className="rounded-md border border-surface-border bg-transparent px-2 py-1 text-xs"
                  >
                    {PLANOS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                        {u.origem === "MANUAL" && u.plano === p ? " (manual)" : ""}
                      </option>
                    ))}
                  </select>
                  <span className="ml-1 text-[10px] text-fg-secondary">{u.origem}</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {u.banido ? (
                    <span
                      className="text-score-low font-medium"
                      data-testid="admin-usuarios-banido"
                    >
                      Banido
                    </span>
                  ) : (
                    <span className="text-accent-emerald">Ativo</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void abrirAtividade(u)}
                    data-testid={`admin-usuarios-atividade-${u.id}`}
                    className="ml-2 rounded-lg border border-surface-border px-2 py-1 text-xs hover:bg-surface-elevated"
                  >
                    Atividade
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPatrocinarPara(u);
                      setPatDesde(hojeISO());
                    }}
                    data-testid={`admin-usuarios-patrocinar-${u.id}`}
                    className="ml-1 rounded-lg border border-surface-border px-2 py-1 text-xs hover:bg-surface-elevated"
                  >
                    Patrocínio
                  </button>
                </td>
                <td className="px-4 py-3">
                  {u.banido ? (
                    <button
                      type="button"
                      onClick={() => void desbanir(u)}
                      data-testid={`admin-usuarios-desbanir-${u.id}`}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium hover:bg-surface-elevated"
                    >
                      Desbanir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void banir(u)}
                      data-testid={`admin-usuarios-banir-${u.id}`}
                      className="rounded-lg bg-score-low px-3 py-1.5 text-xs font-semibold text-ink hover:bg-score-low"
                    >
                      Banir
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-fg-secondary">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {patrocinarPara && (
        <section
          aria-labelledby="patrocinio-title"
          className="mb-6 rounded-lg border border-surface-border bg-surface-card p-4"
          data-testid="admin-patrocinio-form"
        >
          <div className="flex items-center justify-between">
            <h2 id="patrocinio-title" className="text-lg font-semibold text-fg-primary">
              Registrar patrocínio de {patrocinarPara.nome ?? patrocinarPara.email}
            </h2>
            <button
              type="button"
              onClick={() => setPatrocinarPara(null)}
              className="rounded-lg border border-surface-border px-2 py-1 text-xs"
            >
              Fechar
            </button>
          </div>
          <p className="mt-1 text-xs text-fg-secondary">
            O registro público é a prova de que patrocínio compra visibilidade, não nota —
            só entre com autorização por escrito do patrocinador.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-fg-secondary">
              Seção onde aparece
              <input
                value={patSecao}
                onChange={(e) => setPatSecao(e.target.value)}
                placeholder="Ex.: Cinema"
                data-testid="admin-patrocinio-secao"
                className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-fg-secondary">
              Rótulo na interface
              <input
                value={patRotulo}
                onChange={(e) => setPatRotulo(e.target.value)}
                placeholder="Ex.: Conteúdo patrocinado — banner Cinema"
                data-testid="admin-patrocinio-rotulo"
                className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-fg-secondary">
              Início da veiculação
              <input
                type="date"
                value={patDesde}
                onChange={(e) => setPatDesde(e.target.value)}
                data-testid="admin-patrocinio-desde"
                className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void registrarPatrocinio()}
            data-testid="admin-patrocinio-salvar"
            className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
          >
            Registrar no registro público
          </button>
        </section>
      )}

      {/* UAT-46 — o registro que a página /apoie publica, gerido daqui. */}
      <section
        aria-labelledby="patrocinios-title"
        className="mb-6 rounded-lg border border-surface-border bg-surface-card p-4"
        data-testid="admin-patrocinios-registro"
      >
        <h2 id="patrocinios-title" className="text-lg font-semibold text-fg-primary">
          Registro público de patrocínios ({patrocinios?.length ?? 0})
        </h2>
        {patrocinios === null ? (
          <p className="mt-2 text-sm text-fg-secondary">Carregando registro…</p>
        ) : patrocinios.length === 0 ? (
          <p className="mt-2 text-sm text-fg-secondary">
            Nenhum patrocínio ativo — é o estado real que a página /apoie publica.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-surface-border">
            {patrocinios.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{p.patrocinador}</span>
                  <span className="block text-xs text-fg-secondary">
                    {p.secao} · desde {p.desde} — {p.rotulo}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void removerPatrocinio(p.id)}
                  data-testid={`admin-patrocinio-remover-${p.id}`}
                  className="shrink-0 rounded-lg border border-score-low/40 px-2 py-0.5 text-xs text-score-low hover:bg-score-low/10"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {carregandoAtividade && (
        <p className="text-sm text-fg-secondary" data-testid="admin-atividade-carregando">
          Carregando atividade…
        </p>
      )}

      {atividade && (
        <section
          aria-labelledby="atividade-title"
          className="mb-6 rounded-lg border border-surface-border bg-surface-card p-4"
          data-testid="admin-atividade-painel"
        >
          <div className="flex items-center justify-between">
            <h2 id="atividade-title" className="text-lg font-semibold text-fg-primary">
              Atividade de {atividade.usuario.email}
            </h2>
            <button
              type="button"
              onClick={() => setAtividade(null)}
              className="rounded-lg border border-surface-border px-2 py-1 text-xs"
            >
              Fechar
            </button>
          </div>

          <h3 className="mt-3 text-sm font-semibold">Interações ({atividade.interacoes.length})</h3>
          <ul className="mt-1 divide-y divide-surface-border">
            {atividade.interacoes.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {i.midia.titulo ?? i.midia.id}{" "}
                  <span className="text-xs text-fg-secondary">{i.midia.tipo}</span>
                </span>
                <span className="text-xs text-fg-secondary">{i.status}</span>
                <span className="text-xs text-fg-secondary">{i.reacao ?? "—"}</span>
                <button
                  type="button"
                  onClick={() => void removerInteracao(atividade.usuario.id, i.midia.id)}
                  data-testid={`admin-atividade-remover-${i.midia.id}`}
                  className="shrink-0 rounded-lg border border-score-low/40 px-2 py-0.5 text-xs text-score-low hover:bg-score-low/10 hover:bg-score-low/10"
                >
                  Remover
                </button>
              </li>
            ))}
            {atividade.interacoes.length === 0 && (
              <li className="py-2 text-xs text-fg-secondary">Nenhuma interação.</li>
            )}
          </ul>

          <h3 className="mt-4 text-sm font-semibold">Watchlist ({atividade.watchlist.length})</h3>
          <ul className="mt-1 divide-y divide-surface-border">
            {atividade.watchlist.map((w) => (
              <li key={w.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{w.midia_id}</span>
                <span className="text-xs text-fg-secondary">{w.coluna}</span>
                <button
                  type="button"
                  onClick={() => void removerWatchlist(atividade.usuario.id, w.id)}
                  data-testid={`admin-watchlist-remover-${w.id}`}
                  className="shrink-0 rounded-lg border border-score-low/40 px-2 py-0.5 text-xs text-score-low hover:bg-score-low/10 hover:bg-score-low/10"
                >
                  Remover
                </button>
              </li>
            ))}
            {atividade.watchlist.length === 0 && (
              <li className="py-2 text-xs text-fg-secondary">Watchlist vazia.</li>
            )}
          </ul>
        </section>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-fg-secondary" data-testid="admin-usuarios-total">
          {data ? `${data.total} usuários` : ""}
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
