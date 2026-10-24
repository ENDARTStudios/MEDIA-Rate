"use client";

/**
 * Visualização de uma lista colaborativa (pública pelo link).
 * Qualquer usuário logado adiciona títulos; o dono edita/remove/exclui.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/http";
import { Link } from "@/lib/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { ShareLista } from "@/components/listas/ShareLista";
import { nicheFromApiTipo, nicheLabelKey } from "@/lib/dashboard-overview-data";
import { ordenarItens, type ListaResumo, type OrdemLista } from "@/lib/list-share";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/use-auth-store";

interface ListaItem {
  id: string;
  midia_id: string;
  observacao: string | null;
  titulo: string | null;
  tipo: string | null;
  ano_lancamento: number | null;
  imagem_url: string | null;
  score: number | null;
}

interface ListaResponse {
  id: string;
  titulo: string;
  descricao: string | null;
  slug: string;
  dono: { id: string; nome: string | null };
  eh_dono: boolean;
  itens: ListaItem[];
}

interface ResultadoBusca {
  id: string;
  title?: string;
  name?: string;
  type?: string;
  posterUrl?: string | null;
  year?: number | null;
}

function toMediaItem(i: ListaItem): MediaItem {
  const tipo =
    i.tipo === "FILME"
      ? "FILME"
      : i.tipo === "SERIE"
        ? "SERIE"
        : i.tipo === "GAME"
          ? "GAME"
          : "FILME";
  return {
    id: i.midia_id,
    titulo: i.titulo ?? "—",
    tipo,
    ano_lancamento: i.ano_lancamento,
    imagem_url: i.imagem_url,
    score: i.score,
  };
}

export function ListaViewPage({ slug }: { slug: string }) {
  const t = useTranslations("listas");
  const tCommon = useTranslations("common");
  const tc = useTranslations("catalog");
  const { isAuthenticated, user, hydrated: authHydrated } = useAuthStore();
  const [lista, setLista] = useState<ListaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // M16: 404 é estado honesto ("lista não encontrada"); o resto pede "tentar de novo".
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  // D-619: exclusão de lista passa por diálogo acessível em vez de `window.confirm`.
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  // UAT-38: ordem de exibição (e do PDF/convite) escolhida pelo usuário.
  const [ordem, setOrdem] = useState<OrdemLista>("padrao");

  async function carregar() {
    try {
      const data = await api.get<ListaResponse>(`/api/v1/listas/${slug}`);
      setLista(data);
      setTitulo(data?.titulo ?? "");
      setDescricao(data?.descricao ?? "");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNaoEncontrada(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : t("error"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    // carregar depende de slug — re-executa ao navegar entre listas
  }, [slug]);

  async function buscar() {
    if (!busca.trim()) return;
    try {
      // /api/v1/search delega ao discover normalizado (T227/T229) e retorna
      // { items: [{ id, titulo, tipo, ano_lancamento, imagem_url, slug }] }.
      const data = await api.get<{
        items: {
          id: string;
          titulo: string;
          tipo: string;
          ano_lancamento: number | null;
          imagem_url: string | null;
        }[];
      }>(`/api/v1/search?q=${encodeURIComponent(busca)}`);
      setResultados(
        (data?.items ?? []).map((it) => ({
          id: it.id,
          title: it.titulo,
          type: it.tipo,
          posterUrl: it.imagem_url,
          year: it.ano_lancamento,
        })),
      );
    } catch {
      setResultados([]);
    }
  }

  async function adicionar(midiaId: string) {
    try {
      await api.post(`/api/v1/listas/${slug}/itens`, { midia_id: midiaId });
      setResultados([]);
      setBusca("");
      setAdding(false);
      // D-584/B4 (T211): a ação não dava feedback nenhum (só recarregava a lista).
      toast.success(t("itemAdded"));
      await carregar();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  async function remover(itemId: string) {
    try {
      await api.delete(`/api/v1/listas/${slug}/itens/${itemId}`, {});
      // D-584/B4: remover item era silencioso e irreversível.
      toast.success(t("itemRemoved"));
      await carregar();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  async function salvar() {
    try {
      await api.patch(`/api/v1/listas/${slug}`, { titulo, descricao });
      setEditMode(false);
      toast.success(t("saved"));
      await carregar();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  async function excluir() {
    // D-619: sem `window.confirm` — diálogo nativo não segue o tema nem prende o foco
    // (P1 da spec de Listas, `23-listas.md` §11). A confirmação é o `ConfirmDialog` do repo.
    setConfirmarExclusao(false);
    try {
      await api.delete(`/api/v1/listas/${slug}`, {});
      window.location.href = "/listas";
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  if (loading)
    return <p className="max-w-5xl mx-auto py-16 px-4 text-fg-secondary">{t("loading")}</p>;

  if (naoEncontrada || !lista) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <p className="text-fg-secondary mb-4">{t("notFound")}</p>
        <Link href="/listas" className="text-sm font-medium text-indigo hover:text-indigo-300">
          {t("backToListas")}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4">
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            void carregar();
          }}
        />
      </div>
    );
  }

  const podeAdicionar = isAuthenticated;

  // UAT-38: a ordem escolhida vale para a grade, o convite e o PDF. Ordena o
  // resumo (campos da lib) carregando o item original junto, e devolve os itens
  // da API na ordem escolhida — o grid e o `resumo` consomem o mesmo array.
  const itensOrdenados = useMemo(() => {
    if (!lista) return [] as ListaItem[];
    const comOriginal = lista.itens.map((i) => ({
      titulo: i.titulo,
      tipo: i.tipo,
      ano: i.ano_lancamento,
      score: i.score,
      original: i,
    }));
    return ordenarItens(comOriginal, ordem).map((x) => x.original);
  }, [lista, ordem]);

  // Forma normalizada para convite/PDF: o componente de compartilhar não conhece o
  // vocabulário da API (`ano_lancamento`, `midia_id`).
  const resumo: ListaResumo | null = lista
    ? {
        titulo: lista.titulo,
        descricao: lista.descricao,
        slug: lista.slug,
        donoNome: lista.dono.nome,
        itens: itensOrdenados.map((i) => ({
          titulo: i.titulo,
          tipo: i.tipo,
          ano: i.ano_lancamento,
          score: i.score,
        })),
      }
    : null;

  return (
    <div className="max-w-5xl mx-auto py-16 px-4">
      {editMode ? (
        <div className="mb-8 space-y-3 rounded-lg border border-surface-border bg-surface-card p-5">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-fg-primary"
          />
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-fg-primary"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void salvar()}>
              {t("save")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-fg-primary sm:text-4xl">
            {lista.titulo}
          </h1>
          {/* UAT-38: a formatação que o usuário escreveu (quebras de linha) é
              conteúdo — o HTML colapsa \n por padrão, daí o pre-line. */}
          {lista.descricao && (
            <p className="mt-1 whitespace-pre-line text-sm text-fg-secondary">{lista.descricao}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-xs text-fg-muted">
              {t("byOwner", { owner: lista.dono.nome ?? "—" })} ·{" "}
              {t("itemsCount", { count: lista.itens.length })}
            </p>
            {/* UAT-38: ordenação alfabética / ano de lançamento / tipo de mídia. */}
            <label className="ml-auto flex items-center gap-1.5 text-xs text-fg-muted">
              <span>{t("sortLabel")}</span>
              <select
                value={ordem}
                onChange={(e) => setOrdem(e.target.value as OrdemLista)}
                aria-label={t("sortLabel")}
                data-testid="lista-ordem"
                className="rounded-md border border-surface-border bg-surface-elevated px-2 py-1 text-xs text-fg-primary focus:outline-none focus:ring-2 focus:ring-accent-indigo"
              >
                <option value="padrao">{t("sortPadrao")}</option>
                <option value="titulo">{t("sortTitulo")}</option>
                <option value="ano">{t("sortAno")}</option>
                <option value="tipo">{t("sortTipo")}</option>
              </select>
            </label>
          </div>
          {/* Compartilhar está disponível para qualquer visitante: a lista já é
              pública pelo slug. Quem recebe o link pode sugerir títulos. */}
          {resumo && (
            <ShareLista
              lista={resumo}
              ehDono={lista.eh_dono}
              onEditarRecado={() => setEditMode(true)}
            />
          )}
          {lista.eh_dono && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                {t("edit")}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmarExclusao(true)}>
                {t("delete")}
              </Button>
              <ConfirmDialog
                open={confirmarExclusao}
                onOpenChange={setConfirmarExclusao}
                title={t("delete")}
                description={t("confirmDelete")}
                confirmLabel={t("delete")}
                cancelLabel={tCommon("cancel")}
                variant="destructive"
                onConfirm={() => void excluir()}
              />
            </div>
          )}
        </div>
      )}

      {podeAdicionar && (
        <div className="mb-8 rounded-lg border border-surface-border bg-surface-card p-4">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="text-sm font-semibold text-accent-indigo hover:text-accent-indigo-hover"
          >
            {adding ? t("cancel") : `+ ${t("addItem")}`}
          </button>
          {adding && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void buscar();
                  }}
                  placeholder={t("searchPlaceholder")}
                  className="flex-1 rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-fg-primary placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-indigo"
                />
                <Button size="sm" onClick={() => void buscar()}>
                  {t("search")}
                </Button>
              </div>
              {resultados.length > 0 && (
                <ul
                  role="list"
                  data-testid="lista-busca-resultados"
                  className="max-h-64 overflow-y-auto divide-y divide-surface-border rounded-md border border-surface-border"
                >
                  {resultados.slice(0, 10).map((r) => {
                    // UAT-37: nome + ano + tipo — sem isso o usuário precisa
                    // clicar às cegas para descobrir SE é o título procurado.
                    const meta = [
                      r.year != null ? String(r.year) : null,
                      r.type ? tc(nicheLabelKey(nicheFromApiTipo(r.type)) as never) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => void adicionar(r.id)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-fg-primary hover:bg-surface-elevated"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {r.title ?? r.name ?? r.id}
                            {meta && (
                              <span className="ml-2 shrink-0 text-xs text-fg-muted">{meta}</span>
                            )}
                          </span>
                          <span className="shrink-0 text-xs text-fg-muted">+ {t("add")}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {lista.itens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border py-20 text-center">
          <p className="text-sm text-fg-muted">{t("emptyItems")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {itensOrdenados.map((item) => (
            <div key={item.id} className="relative">
              {/* D-582 (T211): o <MediaCard> já é um <a href="/media/...">; o
                  wrapper externo gerava <a> dentro de <a> (HTML inválido e dois
                  alvos de clique). O botão de remover da lista fica ao lado. */}
              <MediaCard media={toMediaItem(item)} />
              {lista.eh_dono && (
                <button
                  type="button"
                  onClick={() => void remover(item.id)}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-brand-foreground shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo"
                  aria-label={t("remove")}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {authHydrated && !isAuthenticated && (
        <p className="mt-8 text-center text-xs text-fg-muted">
          {t("loginToContribute")} {user ? "" : ""}
        </p>
      )}
    </div>
  );
}
