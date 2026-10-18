"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { useAuthStore } from "@/stores/use-auth-store";
import { type MediaItem } from "@/components/MediaCard";
import { CatalogSkeleton } from "@/components/CatalogSkeleton";
import { Button } from "@/components/ui/button";
import { RateLimitedError } from "@/lib/http";
import { RateLimited } from "@/components/ui/rate-limited";
import { colunaLabelKey } from "@/lib/watchlist-labels";
import type { MediaType } from "@/lib/types";
import { isLocalSource, localSrcSet, remoteLadder } from "@/lib/image-policy";
import { formatDate } from "@/lib/i18n";
import { animate } from "animejs/animation";
import { useReducedMotion } from "motion/react";
import { useRouter } from "@/lib/navigation";
import { CategoryChip } from "@/components/media-rate-ui/CategoryChip";
import { WatchlistKanban } from "./watchlist/WatchlistKanban";
import { entryToMediaItem, ScoreDelta } from "./watchlist/WatchlistCard";

function WatchlistRoulette({ items }: { items: { id: string; title: string }[] }) {
  const t = useTranslations("watchlist");
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const labelRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<ReturnType<typeof animate>[]>([]);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    return () => {
      animRef.current.forEach((a) => {
        try {
          a.pause();
        } catch {
          // animação já finalizada
        }
      });
    };
  }, []);

  function sortear() {
    if (rolling || items.length === 0) return;
    setWinner(null);
    setRolling(true);
    const sorteado = items[Math.floor(Math.random() * items.length)];

    if (shouldReduce) {
      setWinner(sorteado);
      setRolling(false);
      return;
    }

    // Roleta: cicla títulos rapidamente (Anime.js) e pousa no sorteado.
    let ciclo = 0;
    const totalCiclos = 14;
    const timer = window.setInterval(() => {
      ciclo++;
      if (labelRef.current) {
        const item = items[ciclo % items.length];
        if (item) labelRef.current.textContent = item.title;
      }
      if (ciclo >= totalCiclos) {
        window.clearInterval(timer);
        setWinner(sorteado);
        if (labelRef.current) labelRef.current.textContent = sorteado.title;
        if (labelRef.current) {
          animRef.current.push(
            animate(labelRef.current, {
              scale: [0.9, 1.15, 1],
              duration: 400,
              ease: "outBack",
            }),
          );
        }
        setRolling(false);
      }
    }, 90);
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 min-w-[180px] text-center">
        <span ref={labelRef} className="block truncate text-sm font-medium text-fg-primary">
          {winner ? winner.title : t("queroVer")}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={sortear} disabled={rolling}>
        {rolling ? "..." : "Sortear"}
      </Button>
      {winner && (
        <Button size="sm" onClick={() => router.push(`/media/${winner.id}`)}>
          Abrir
        </Button>
      )}
    </div>
  );
}

export function WatchlistClient() {
  const t = useTranslations("watchlist");
  const locale = useLocale();
  const { user } = useAuthStore();
  const { entries, isLoading, error, limitReached, fetchWatchlist, removeItem, moveItem } =
    useWatchlistStore();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [filtroTipo, setFiltroTipo] = useState<"all" | MediaType>("all");

  useEffect(() => {
    fetchWatchlist();
  }, []);

  // T190: filtro por mídia dentro da watchlist (chips do catálogo).
  // D-233: os 6 tipos do catálogo são filtráveis — Livros, Quadrinhos e
  // Mangás incluídos (antes só filme/série/game e o resto ficava invisível
  // em qualquer filtro).
  const filtradas = useMemo(
    () =>
      filtroTipo === "all"
        ? entries
        : entries.filter((e) => (e.media?.type ?? "movie") === filtroTipo),
    [entries, filtroTipo],
  );
  const filtroCounts = useMemo(() => {
    const c: Record<"all" | MediaType, number> = {
      all: entries.length,
      movie: 0,
      series: 0,
      game: 0,
      book: 0,
      comic: 0,
      manga: 0,
    };
    entries.forEach((e) => {
      const tipo = (e.media?.type ?? "movie") as keyof typeof c;
      c[tipo] += 1;
    });
    return c;
  }, [entries]);

  const wantItems = useMemo(
    () =>
      filtradas
        .filter((e) => (e.status ?? e.coluna) === "WANT")
        .map((e) => entryToMediaItem(e))
        .filter((m): m is MediaItem => m != null)
        .map((m) => ({ id: m.id, title: m.titulo })),
    [filtradas],
  );

  const isTrial =
    user?.plan === "PLUS" &&
    user.trialEndsAt != null &&
    new Date(user.trialEndsAt).getTime() > Date.now();
  const planKey =
    user?.plan === "PREMIUM" ? "planPremium" : user?.plan === "PLUS" ? "planPlus" : "planFree";

  if (isLoading && entries.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-fg-primary sm:text-4xl mb-4">
          {t("title")}
        </h1>
        {/* D-627: o store já marcava `limitReached` no 402, mas a tela não dizia nada — o
          usuário batia no limite do plano sem caminho para resolver (o /historico e /listas
          já têm esse CTA; a watchlist era a única sem). */}
        {limitReached && (
          <p className="mb-6 rounded-lg border border-score-medium/40 bg-score-medium/10 px-4 py-3 text-sm text-score-medium">
            {t("limitReached")}{" "}
            <Link href="/pricing" className="font-semibold underline underline-offset-4">
              {t("upgradeCta")}
            </Link>
          </p>
        )}
        <CatalogSkeleton count={6} />
      </div>
    );
  }

  if (error instanceof RateLimitedError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-fg-primary sm:text-4xl mb-8">
          {t("title")}
        </h1>
        <RateLimited retryAfterSeconds={error.retryAfterSeconds} onRetry={() => fetchWatchlist()} />
      </div>
    );
  }

  if (error && entries.length === 0) {
    // D-626: `error.message` vinha do store com texto fixo em pt-BR. Aqui a mensagem só é
    // usada quando é do erro da API; caso contrário, rótulo traduzido do namespace.
    const errorMsg =
      error instanceof RateLimitedError
        ? t("loadError")
        : typeof error === "string"
          ? t("loadError")
          : error.message;
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-fg-primary sm:text-4xl mb-8">
          {t("title")}
        </h1>
        <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
          <p className="text-fg-secondary mb-2">{errorMsg}</p>
          <Button onClick={() => fetchWatchlist()} variant="ghost" size="sm">
            {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-fg-primary sm:text-4xl mb-8">
          {t("title")}
        </h1>
        <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
          <p className="text-fg-secondary mb-4">{t("empty")}</p>
          <Link href="/catalog">
            <Button>{t("exploreCatalog")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-fg-primary sm:text-4xl">
          {t("title")}
        </h1>
        {user?.plan && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-elevated text-fg-secondary border border-surface-border">
            {t(planKey)}
          </span>
        )}
        {isTrial && user?.trialEndsAt && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-accent-amber bg-accent-amber/15 border border-accent-amber/30">
            {t("trialActive", { date: formatDate(user.trialEndsAt, locale) })}
          </span>
        )}
        {user?.plan === "FREE" && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs text-fg-secondary bg-surface-elevated border border-surface-border">
            {t("itemsCount", { count: entries.length })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <WatchlistRoulette items={wantItems} />
          <div
            className="flex rounded-lg border border-surface-border overflow-hidden"
            role="group"
            aria-label="Vista"
          >
            <button
              type="button"
              onClick={() => setView("kanban")}
              aria-pressed={view === "kanban"}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "kanban" ? "bg-accent-indigo text-accent-indigo-foreground" : "bg-surface-card text-fg-secondary hover:text-fg-primary"}`}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setView("lista")}
              aria-pressed={view === "lista"}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "lista" ? "bg-accent-indigo text-accent-indigo-foreground" : "bg-surface-card text-fg-secondary hover:text-fg-primary"}`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* T190: filtro por mídia (chips do catálogo) */}
      <div
        className="flex flex-wrap items-center gap-2 mb-6"
        role="group"
        aria-label={t("filterByType")}
      >
        <CategoryChip
          type="movie"
          count={filtroCounts.all}
          active={filtroTipo === "all"}
          onClick={() => setFiltroTipo("all")}
          label={t("todos")}
        />
        <CategoryChip
          type="movie"
          count={filtroCounts.movie}
          active={filtroTipo === "movie"}
          onClick={() => setFiltroTipo("movie")}
        />
        <CategoryChip
          type="series"
          count={filtroCounts.series}
          active={filtroTipo === "series"}
          onClick={() => setFiltroTipo("series")}
        />
        <CategoryChip
          type="game"
          count={filtroCounts.game}
          active={filtroTipo === "game"}
          onClick={() => setFiltroTipo("game")}
        />
        <CategoryChip
          type="book"
          count={filtroCounts.book}
          active={filtroTipo === "book"}
          onClick={() => setFiltroTipo("book")}
        />
        <CategoryChip
          type="comic"
          count={filtroCounts.comic}
          active={filtroTipo === "comic"}
          onClick={() => setFiltroTipo("comic")}
        />
        <CategoryChip
          type="manga"
          count={filtroCounts.manga}
          active={filtroTipo === "manga"}
          onClick={() => setFiltroTipo("manga")}
        />
      </div>

      {view === "kanban" ? (
        <WatchlistKanban
          entries={filtradas}
          onRemove={(entryId) => {
            setDeleting(entryId);
            void removeItem(entryId).finally(() => setDeleting(null));
          }}
          onMove={(entryId, coluna) => {
            void moveItem(entryId, coluna);
          }}
          removingId={deleting}
          tipoFiltro={filtroTipo}
        />
      ) : (
        <ul
          role="list"
          className="divide-y divide-surface-border rounded-lg border border-surface-border bg-surface-card"
        >
          {filtradas.map((entry) => {
            const item = entryToMediaItem(entry);
            const status = entry.status ?? entry.coluna ?? "WANT";
            const statusLabel = colunaLabelKey(entry.media?.type, status);
            return (
              <li key={entry.id} className="flex items-center gap-4 px-4 py-3">
                {item ? (
                  <>
                    {/* T373: miniatura do pôster na visão de lista (antes só texto). */}
                    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-surface-elevated">
                      {item.imagem_url ? (
                        (() => {
                          // T031/T036: estático com ladder (local ou remota);
                          // sem ladder → bypass. Zero transformação runtime.
                          if (isLocalSource(item.imagem_url)) {
                            return (
                              <img
                                src={item.imagem_url}
                                srcSet={localSrcSet(item.imagem_url)}
                                alt=""
                                sizes="44px"
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            );
                          }
                          const ladder = remoteLadder(item.imagem_url);
                          if (ladder) {
                            return (
                              <img
                                src={ladder.src}
                                srcSet={ladder.srcSet}
                                alt=""
                                sizes="44px"
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            );
                          }
                          return (
                            <Image
                              src={item.imagem_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="44px"
                              unoptimized
                            />
                          );
                        })()
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-fg-muted">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <Link href={`/media/${item.id}`} className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium text-fg-primary hover:text-accent-indigo">
                        {item.titulo}
                      </span>
                      <span className="text-xs text-fg-muted">{item.ano_lancamento ?? "—"}</span>
                    </Link>
                    <span className="text-xs text-fg-secondary">{t(statusLabel)}</span>
                    <ScoreDelta entry={entry} />
                    <button
                      onClick={() => {
                        setDeleting(entry.id);
                        void removeItem(entry.id).finally(() => setDeleting(null));
                      }}
                      disabled={deleting === entry.id}
                      className="text-xs text-fg-muted hover:text-red-400 transition-colors"
                    >
                      {deleting === entry.id ? "..." : t("removeFromWatchlist")}
                    </button>
                  </>
                ) : (
                  <span className="flex-1 text-sm text-fg-secondary">{entry.mediaId}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
