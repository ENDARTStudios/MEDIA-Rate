"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { StatusGlyph } from "@/components/interaction/StatusIcons";
import { CATEGORY_TOKENS, colors } from "@/lib/design-tokens";
import { Link } from "@/lib/navigation";
import {
  getInteracoes,
  removerInteracao,
  type Interacao,
  type StatusConsumoApi,
  type TipoMidiaApi,
} from "@/lib/api-interacoes";
import { NICHE_ORDER, nicheFromApiTipo, nicheLabelKey } from "@/lib/dashboard-overview-data";
import { colunaLabelKey, colunaNeutraLabelKey, consumoParaColuna } from "@/lib/watchlist-labels";

const STATUS_TABS: StatusConsumoApi[] = ["QUERO_CONSUMIR", "CONSUMINDO", "CONCLUIDO", "ABANDONADO"];
const LIMITE_PAGINA = 50;

/** Nicho da UI → enum de tipo da API (mesmo mapa do dashboard-overview-data). */
const NICHO_PARA_TIPO = {
  movie: "FILME",
  series: "SERIE",
  game: "GAME",
  book: "LIVRO",
  comic: "COMIC",
  manga: "MANGA",
} as const;

function toMediaItem(i: Interacao): MediaItem | null {
  if (!i.midia.titulo) return null;
  return {
    id: i.midia.id,
    slug: i.midia.slug,
    titulo: i.midia.titulo,
    tipo: i.midia.tipo,
    ano_lancamento: i.midia.anoLancamento,
    imagem_url: i.midia.imagemUrl,
    score: i.midia.score,
  };
}

interface Filtros {
  status: StatusConsumoApi | null;
  tipo: TipoMidiaApi | null;
}

/**
 * Biblioteca do usuário (D-525): TODAS as escolhas do usuário organizadas
 * pelos 4 status de consumo com rótulo conjugado por tipo de mídia
 * ("quero jogar", "lendo", "vi"…) e filtro por tipo. Fonte: interações reais
 * (GET /api/v1/interacoes — envelope { items, total, porStatus, nextCursor });
 * abas usam as contagens GLOBAIS do servidor; filtros são server-side e
 * "carregar mais" segue o cursor. /watchlist continua o Kanban de planejamento.
 */
export function BibliotecaClient({
  initialStatus,
  initialTipo,
}: {
  initialStatus: StatusConsumoApi | null;
  initialTipo: TipoMidiaApi | null;
}) {
  const t = useTranslations("biblioteca");
  const tw = useTranslations("watchlist");
  const tc = useTranslations("catalog");
  const [filtros, setFiltros] = useState<Filtros>({
    status: initialStatus,
    tipo: initialTipo,
  });
  const [items, setItems] = useState<Interacao[]>([]);
  const [porStatus, setPorStatus] = useState<Record<StatusConsumoApi, number>>({
    QUERO_CONSUMIR: 0,
    CONSUMINDO: 0,
    CONCLUIDO: 0,
    ABANDONADO: 0,
  });
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [error, setError] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const carregar = useCallback(async (f: Filtros, cursor?: string) => {
    const anexando = Boolean(cursor);
    if (anexando) setCarregandoMais(true);
    else setLoading(true);
    setError(false);
    const pagina = await getInteracoes({
      status: f.status ?? undefined,
      tipo: f.tipo ?? undefined,
      limit: LIMITE_PAGINA,
      cursor,
    });
    if (pagina === null) {
      setError(true);
    } else {
      setPorStatus(pagina.porStatus);
      setTotalFiltrado(pagina.total);
      setNextCursor(pagina.nextCursor);
      setItems((anteriores) => (anexando ? [...anteriores, ...pagina.items] : pagina.items));
    }
    setLoading(false);
    setCarregandoMais(false);
  }, []);

  useEffect(() => {
    void carregar({ status: initialStatus, tipo: initialTipo });
  }, []);

  const trocarStatus = (s: StatusConsumoApi | null) => {
    const novos = { ...filtros, status: s };
    setFiltros(novos);
    void carregar(novos);
  };
  const trocarTipo = (n: TipoMidiaApi | null) => {
    const novos = { ...filtros, tipo: n };
    setFiltros(novos);
    void carregar(novos);
  };

  // Exclui a interação (item sai da biblioteca) e atualiza contagens locais.
  const removerItem = async (i: Interacao) => {
    setRemovendoId(i.midia.id);
    const ok = await removerInteracao(i.midia.id);
    if (ok) {
      setItems((anteriores) => anteriores.filter((x) => x.midia.id !== i.midia.id));
      setPorStatus((p) => ({ ...p, [i.status]: Math.max(0, (p[i.status] ?? 1) - 1) }));
      setTotalFiltrado((t) => Math.max(0, t - 1));
    }
    setRemovendoId(null);
  };

  const somaPorStatus = (Object.values(porStatus) as number[]).reduce((a, b) => a + b, 0);
  const vazio = somaPorStatus === 0;

  if (loading) {
    return <div className="py-8 text-fg-secondary">{t("loading")}</div>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
        <p>{t("error")}</p>
        <button
          type="button"
          onClick={() => void carregar(filtros)}
          className="mt-3 rounded-lg bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/30"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="biblioteca-client">
      {/* Abas por status (4) com contagens GLOBAIS do servidor. */}
      <div
        data-testid="biblioteca-tabs"
        className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-border bg-surface-card p-1"
        role="tablist"
        aria-label={t("tabsAria")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={filtros.status === null}
          onClick={() => trocarStatus(null)}
          className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${filtros.status === null ? "bg-accent-indigo text-surface-bg" : "text-fg-muted hover:text-fg-primary"}`}
        >
          {t("tabAll")} · {somaPorStatus}
        </button>
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={filtros.status === s}
            onClick={() => trocarStatus(s)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${filtros.status === s ? "bg-accent-indigo text-surface-bg" : "text-fg-muted hover:text-fg-primary"}`}
          >
            <StatusGlyph status={s} size={12} />
            {tw(colunaNeutraLabelKey(consumoParaColuna(s)))} · {porStatus[s]}
          </button>
        ))}
      </div>

      {/* Filtro por tipo de mídia (server-side; cores canônicas dos ícones). */}
      <div
        data-testid="biblioteca-tipos"
        className="flex flex-wrap items-center gap-1.5"
        aria-label={t("tiposAria")}
      >
        <button
          type="button"
          onClick={() => trocarTipo(null)}
          className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${filtros.tipo === null ? "border-accent-indigo/40 bg-accent-indigo/10 text-fg-primary" : "border-surface-border text-fg-muted hover:text-fg-primary"}`}
        >
          {t("filterAll")}
        </button>
        {NICHE_ORDER.map((n) => {
          const token = CATEGORY_TOKENS[n as keyof typeof CATEGORY_TOKENS];
          const Icon = token.icon;
          const tipoApi = NICHO_PARA_TIPO[n];
          const selecionado = filtros.tipo === tipoApi;
          return (
            <button
              key={n}
              type="button"
              onClick={() => trocarTipo(selecionado ? null : tipoApi)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${selecionado ? "text-fg-primary" : "text-fg-muted hover:text-fg-primary"}`}
              style={
                selecionado
                  ? { borderColor: `${token.color}66`, background: `${token.color}1a` }
                  : { borderColor: colors.surface.border }
              }
            >
              <Icon size={12} style={{ color: token.color }} />
              {tc(nicheLabelKey(n) as never)}
            </button>
          );
        })}
      </div>

      {vazio ? (
        <div className="rounded-xl border border-accent-indigo/20 bg-gradient-to-br from-surface-elevated via-surface-card to-surface-card p-10 text-center">
          <p className="text-lg font-medium text-fg-primary">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-fg-muted">{t("emptyHint")}</p>
          <Link
            href="/catalog"
            className="mt-5 inline-flex rounded-xl bg-accent-indigo px-5 py-2.5 text-sm font-semibold text-surface-bg transition hover:bg-accent-violet"
          >
            {t("emptyCta")}
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-card p-10 text-center">
          <p className="text-sm font-medium text-fg-secondary">{t("filterEmptyTitle")}</p>
          <p className="mt-1 text-[11px] text-fg-muted">{t("filterEmptyHint")}</p>
        </div>
      ) : (
        <>
          <div
            data-testid="biblioteca-grid"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
          >
            {items.map((i) => {
              const item = toMediaItem(i);
              if (!item) return null;
              const niche = nicheFromApiTipo(i.midia.tipo);
              const token = CATEGORY_TOKENS[niche as keyof typeof CATEGORY_TOKENS];
              return (
                <div key={i.id} data-testid="biblioteca-item" className="flex flex-col">
                  <MediaCard media={item} />
                  <div
                    data-testid="biblioteca-item-footer"
                    className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-1"
                  >
                    <span
                      className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold"
                      style={{ color: token.color }}
                    >
                      <StatusGlyph status={i.status} size={12} />
                      <span className="truncate">
                        {tw(colunaLabelKey(i.midia.tipo, consumoParaColuna(i.status)) as never)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-fg-muted">
                      {tc(nicheLabelKey(niche) as never)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void removerItem(i)}
                      disabled={removendoId === i.midia.id}
                      data-testid={`biblioteca-remover-${i.midia.id}`}
                      title={t("removerAria")}
                      aria-label={t("removerAria")}
                      className="ml-auto shrink-0 rounded-lg border border-surface-border bg-surface-card px-2 py-0.5 text-[10px] font-medium text-fg-muted transition hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
                    >
                      {removendoId === i.midia.id ? "…" : t("remover")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {nextCursor && (
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => void carregar(filtros, nextCursor)}
                disabled={carregandoMais}
                data-testid="biblioteca-carregar-mais"
                className="rounded-xl border border-surface-border bg-surface-card px-5 py-2.5 text-sm font-semibold text-fg-primary transition hover:bg-surface-elevated disabled:opacity-50"
              >
                {carregandoMais ? t("loading") : t("loadMore")}
              </button>
              <p className="text-[10px] text-fg-muted">
                {t("mostrandoDe", { n: items.length, total: totalFiltrado })}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
