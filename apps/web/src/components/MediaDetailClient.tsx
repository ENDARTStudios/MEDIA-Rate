"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { getMediaBySlug } from "@/lib/api";
import type { Media } from "@/lib/types";
import { MediaScoreModule } from "./MediaScoreModule";
import { SeasonTabs } from "./media/SeasonTabs";
import { Button } from "@/components/ui/button";
import { WatchlistButton } from "./WatchlistButton";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/use-auth-store";
import { displaySrc, isLocalSource, localSrcSet, remoteLadder } from "@/lib/image-policy";
import { api } from "@/lib/http";
import {
  AgeRatingBadge,
  GenreChipRow,
  SHARED_GENRES,
  AwardsShowcase,
  FranchiseCarousel,
  OriginBadge,
} from "@/components/media-rate-ui";
import { RelacionadasSection } from "./ficha/RelacionadasSection";
import { TemporadasSection } from "./ficha/TemporadasSection";
import { titleForLocale, synopsisForLocale, generoTraduzido } from "@/lib/i18n-content";
import { Monitor, Gamepad2, Smartphone, Tv, Globe } from "lucide-react";
import { RateLimitedError } from "@/lib/http";
import { RateLimited } from "@/components/ui/rate-limited";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { colors } from "@/lib/design-tokens";
import { RelatedWorksBlock } from "./discovery/RelatedWorksBlock";
import { StatusReactionControl } from "./interaction/StatusReactionControl";

export function MediaDetailClient({
  slug,
  initialData,
}: {
  slug: string;
  initialData?: Media | null;
}) {
  const t = useTranslations("catalog");
  const tg = useTranslations("genres");
  const tm = useTranslations("metadados");
  const locale = useLocale();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    data: media,
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ["media", slug], queryFn: () => getMediaBySlug(slug), initialData });

  // Histórico (D-132): registra a visualização quando autenticado
  // (fire-and-forget — nunca quebra a página).
  useEffect(() => {
    if (!media?.id || !isAuthenticated) return;
    void api.post(`/api/v1/midias/${media.id}/view`, {}).catch(() => undefined);
  }, [media?.id, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-surface-card rounded-md" />
          <div className="h-8 w-2/3 bg-surface-card rounded-lg" />
          <div className="h-4 w-1/3 bg-surface-card rounded-lg" />
        </div>
      </div>
    );
  }

  if (error instanceof RateLimitedError) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4">
        <RateLimited retryAfterSeconds={error.retryAfterSeconds} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4">
        <EmptyState
          title={t("notFoundTitle")}
          description={t("notFoundDesc")}
          action={
            <Link
              href="/catalog"
              className="px-6 py-2 bg-accent-indigo text-accent-indigo-foreground rounded-lg text-sm font-medium hover:brightness-110 transition-colors"
            >
              {t("exploreCatalog")}
            </Link>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4">
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  const tipoLabel =
    media.type === "movie"
      ? t("filme")
      : media.type === "series"
        ? t("serie")
        : media.type === "game"
          ? t("game")
          : media.type === "comic"
            ? t("comic")
            : media.type === "manga"
              ? t("manga")
              : t("livro");

  const plataformaIcon = (nome: string) => {
    const n = nome.toLowerCase();
    if (n.includes("pc") || n.includes("windows")) return Monitor;
    if (n.includes("playstation")) return Gamepad2;
    if (n.includes("xbox")) return Gamepad2;
    if (n.includes("switch")) return Gamepad2;
    if (n.includes("android") || n.includes("ios") || n.includes("mobile")) return Smartphone;
    if (n.includes("tv") || n.includes("netflix") || n.includes("prime")) return Tv;
    return Globe;
  };

  return (
    <article>
      {/* CTA de watchlist sempre visível: sticky em mobile, fixo no header em desktop. */}
      <div
        className="fixed bottom-0 inset-x-0 z-sticky lg:hidden border-t border-surface-border bg-surface-bg/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        data-testid="watchlist-cta-sticky"
      >
        <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg-primary truncate">
              {titleForLocale(media, locale)}
            </p>
            <p className="text-xs text-fg-muted">
              {tipoLabel} · {media.year}
            </p>
          </div>
          <WatchlistButton mediaId={media.id} mediaType={media.type} />
        </div>
      </div>

      {/* Hero */}
      <div className="relative bg-surface-card overflow-hidden">
        {media.backdropUrl &&
          (() => {
            // T036: hero full-bleed; D-582/A8 (T211): o ramo de imagem crua (sem otimizador) usava o rung
            // `original` do TMDB sem hint de prioridade. O backdrop é o LCP da
            // ficha e fica em opacity-30, então o rung de display (1280) entrega o
            // mesmo resultado com uma fração dos bytes.
            const ladder = remoteLadder(media.backdropUrl);
            return ladder ? (
              <img
                src={displaySrc(ladder.src, 1280) ?? ladder.src}
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-30"
              />
            ) : (
              <Image
                src={media.backdropUrl}
                alt=""
                fill
                className="object-cover opacity-30"
                priority
                sizes="100vw"
                aria-hidden="true"
                unoptimized
              />
            );
          })()}
        <div className="absolute inset-0 bg-gradient-to-br from-surface-card/90 to-surface-bg/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-bg via-surface-bg/60 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <nav
            className="flex items-center gap-2 text-sm text-fg-secondary mb-8"
            aria-label="Breadcrumb"
          >
            <Link href="/catalog" className="hover:text-fg-primary transition-colors">
              {t("title")}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={`/catalog?type=${media.type}`}
              className="hover:text-fg-primary transition-colors"
            >
              {tipoLabel}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-fg-primary truncate">{titleForLocale(media, locale)}</span>
          </nav>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="shrink-0 relative w-48 aspect-[2/3]">
              {media.posterUrl ? (
                (() => {
                  if (isLocalSource(media.posterUrl)) {
                    // T031: <img> estático com ladder própria (next/image não
                    // aceita srcSet customizado); container aspect-[2/3] evita CLS.
                    return (
                      <img
                        src={media.posterUrl}
                        srcSet={localSrcSet(media.posterUrl)}
                        alt={t("posterAlt", { titulo: titleForLocale(media, locale) })}
                        sizes="192px"
                        className="absolute inset-0 h-full w-full object-cover rounded-md shadow-surface-2"
                      />
                    );
                  }
                  const ladder = remoteLadder(media.posterUrl);
                  if (ladder) {
                    return (
                      <img
                        src={ladder.src}
                        srcSet={ladder.srcSet}
                        alt={t("posterAlt", { titulo: titleForLocale(media, locale) })}
                        sizes="192px"
                        className="absolute inset-0 h-full w-full object-cover rounded-md shadow-surface-2"
                      />
                    );
                  }
                  return (
                    <Image
                      src={media.posterUrl}
                      alt={t("posterAlt", { titulo: titleForLocale(media, locale) })}
                      fill
                      className="object-cover rounded-md shadow-surface-2"
                      sizes="192px"
                      unoptimized
                    />
                  );
                })()
              ) : (
                <div className="w-full h-full bg-surface-card rounded-md flex items-center justify-center text-fg-secondary shadow-surface-2">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <span className="text-xs font-semibold text-accent-indigo uppercase tracking-widest">
                  {tipoLabel}
                </span>
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-fg-primary mt-1 leading-tight">
                  {titleForLocale(media, locale)}
                </h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-fg-secondary">
                  <span>{media.year}</span>
                  {media.duration && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{media.duration}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>
                    {media.genres
                      .slice(0, 3)
                      .map((g) => generoTraduzido(tg, g))
                      .join(", ")}
                  </span>
                </div>
              </div>

              {media.streaming.length > 0 ? (
                <div data-testid="platforms-section">
                  <p className="text-xs text-fg-secondary font-medium uppercase tracking-wider mb-2">
                    {media.type === "game" ? t("whereToPlay") : t("whereToWatch")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {media.streaming.map((s) => {
                      const Icon = plataformaIcon(s.name);
                      return (
                        <span
                          key={s.name}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-card border border-[rgba(129,140,248,0.08)] rounded-lg text-xs text-fg-primary font-medium"
                        >
                          <Icon className="h-3.5 w-3.5 text-accent-indigo" aria-hidden="true" />
                          {s.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {/* T200/T205: StatusReactionControl completo (status + reação +
                    motivo) — controle único de salvar/consumo (Addendum 4). */}
                <StatusReactionControl midiaId={media.id} mediaType={media.type} />
                <WatchlistButton mediaId={media.id} mediaType={media.type} />
                <ShareButton />
              </div>
              <MediaScoreModule score={media.score} mediaType={media.type} />
              {/* T199: descoberta cross-mídia acima da dobra — 1 aresta basta. */}
              <RelatedWorksBlock mediaId={media.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs.Root defaultValue="synopsis">
          <Tabs.List
            className="flex overflow-x-auto scrollbar-none border-b border-[rgba(129,140,248,0.08)] mb-8"
            aria-label={t("tabsLabel")}
          >
            {[
              ["synopsis", t("synopsis")],
              ["cast", t("cast")],
              ["reviews", t("reviews")],
              ["metadados", tm("title")],
            ].map(([v, l]) => (
              <Tabs.Trigger
                key={v}
                value={v}
                className="px-4 py-2.5 text-sm text-fg-secondary border-b-2 border-transparent data-[state=active]:border-accent-500 data-[state=active]:text-fg-primary transition-colors"
              >
                {l}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="synopsis" className="focus-visible:outline-none">
            <SynopsisBlock synopsis={synopsisForLocale(media, locale)} />
          </Tabs.Content>

          <Tabs.Content value="metadados" className="focus-visible:outline-none">
            <div className="space-y-8">
              {/* Classificação indicativa (✅ — sempre quando houver dado). */}
              {media.classificacaoIndicativa && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary mb-3">
                    {tm("classification")}
                  </h2>
                  <AgeRatingBadge
                    rating={media.classificacaoIndicativa as "L" | "10" | "12" | "14" | "16" | "18"}
                    source={
                      ["book", "comic", "manga"].includes(media.type) ? "sugerida" : "oficial"
                    }
                    perSeason={media.type === "series"}
                  />
                </div>
              )}

              {/* T287 — origem editorial + classificação da região do locale + prêmios. */}
              {(() => {
                const regiaoLocale = locale === "pt-BR" ? "BR" : locale === "es-ES" ? "ES" : "US";
                const classificacaoLocal = media.classificacoesRegiao?.find(
                  (c) => c.regiao === regiaoLocale,
                );
                const temContexto =
                  media.origemEditorial || classificacaoLocal || (media.premios?.length ?? 0) > 0;
                if (!temContexto) return null;
                return (
                  <div className="space-y-6">
                    {media.origemEditorial && (
                      <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary mb-2">
                          {tm("originTitle")}
                        </h2>
                        <span className="inline-flex items-center rounded-full border border-surface-border bg-surface-elevated px-2.5 py-1 text-xs text-fg-primary">
                          {tm(`origin_${media.origemEditorial.toLowerCase()}`)}
                        </span>
                      </div>
                    )}
                    {classificacaoLocal && (
                      <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary mb-2">
                          {tm("regionalRating")}
                        </h2>
                        <p className="text-sm text-fg-primary">
                          <AgeRatingBadge
                            rating={
                              classificacaoLocal.valor as "L" | "10" | "12" | "14" | "16" | "18"
                            }
                            source="oficial"
                          />
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Gêneros (✅ — taxonomia dupla: narrativo compartilhado + específico). */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary mb-3">
                  {tm("genres")}
                </h2>
                <GenreChipRow
                  sharedGenres={media.genres.filter((g) => SHARED_GENRES.includes(g))}
                  mediaSpecificGenres={media.genres.filter((g) => !SHARED_GENRES.includes(g))}
                  mediaType={media.type}
                />
              </div>

              {/* Nota por unidade seriada (T163 — dado real de /temporadas). */}
              {media.type === "series" && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary mb-3">
                    {tm("seriatedScores")}
                  </h2>
                  <TemporadasSection midiaId={media.id} />
                </div>
              )}

              {/* Origem da produção (⚠️ — só quando houver dado). */}
              {media.paisOrigem && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary mb-3">
                    {tm("origin")}
                  </h2>
                  <OriginBadge
                    countryCode={media.paisOrigem}
                    roleLabel={
                      media.type === "game"
                        ? (tm("roleStudio") ?? "Estúdio")
                        : (tm("roleStudio") ?? "Estúdio")
                    }
                    mediaType={media.type}
                  />
                </div>
              )}

              {/* Produtoras/estúdios/editoras (T164 — dado real da fonte). */}
              {(media.produtoras?.length ?? 0) > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary mb-3">
                    {tm("produtoras")}
                  </h2>
                  <div className="flex flex-wrap gap-2" data-testid="ficha-produtoras">
                    {(media.produtoras ?? []).map((e) => (
                      <span
                        key={`${e.papel}-${e.nome}`}
                        className="px-3 py-1 rounded-full bg-accent-indigo/10 text-accent-indigo-hover text-xs font-medium"
                      >
                        {e.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prêmios (T163 — dado real de premios; sem dado → "Não informado"). */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary mb-3">
                  {tm("awards")}
                </h2>
                <AwardsShowcase
                  awards={(media.premios ?? []).map((p) => ({
                    name: p.nome,
                    category: p.categoria,
                    year: p.ano,
                    won: p.venceu,
                    organization: p.organizacao,
                  }))}
                />
              </div>

              {/* Sequências/conteúdo relacionado (✅ — franquia real quando houver). */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary mb-3">
                  {tm("franchise")}
                </h2>
                {media.franquias && media.franquias.length > 0 ? (
                  media.franquias.map((franquia) => (
                    <FranchiseCarousel
                      key={franquia.id}
                      items={franquia.itens.map((i) => ({
                        midiaId: i.midiaId,
                        tipo: i.tipo,
                        titulo: i.titulo,
                        ano: i.ano,
                        posterUrl: i.imagemUrl,
                        score: i.score,
                        ordemLancamento: i.ordemLancamento,
                        ordemCronologica: i.ordemCronologica,
                      }))}
                      currentMediaId={media.id}
                    />
                  ))
                ) : (
                  <FranchiseCarousel items={[]} currentMediaId={media.id} />
                )}
                {/* T163: grafo de conteúdo relacionado (adaptações/sequências/universo). */}
                <div className="mt-4">
                  <RelacionadasSection relacoes={media.relacoes ?? []} />
                </div>
              </div>
            </div>
          </Tabs.Content>

          <Tabs.Content value="cast" className="focus-visible:outline-none">
            {media.cast.length === 0 ? (
              <EmptySection message={t("castUnavailable")} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {media.cast.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-3 p-3 bg-surface-card rounded-md border border-surface-border/20"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-card flex items-center justify-center text-fg-secondary text-sm font-medium">
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-fg-primary truncate font-medium">{c.name}</p>
                      <p className="text-xs text-fg-secondary truncate">{c.role}</p>
                    </div>
                  </div>
                ))}
                {media.crew.map((c) => (
                  <div
                    key={c.name + c.role}
                    className="flex items-center gap-3 p-3 bg-surface-card rounded-md border border-surface-border/20 opacity-60"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-card flex items-center justify-center text-fg-secondary text-sm font-medium">
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-fg-primary truncate">{c.name}</p>
                      <p className="text-xs text-fg-secondary truncate">{c.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="reviews" className="focus-visible:outline-none">
            {media.reviews.length === 0 ? (
              <EmptySection message={t("noReviews")} />
            ) : (
              <div className="space-y-4">
                {media.reviews.map((r) => (
                  <div
                    key={r.author + r.date}
                    className="p-4 bg-surface-card rounded-md border border-surface-border/20"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-fg-primary font-medium">{r.author}</span>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{
                          backgroundColor:
                            r.rating >= 80 ? `${colors.score.high}20` : `${colors.score.medium}20`,
                          color: r.rating >= 80 ? colors.score.high : colors.score.medium,
                        }}
                      >
                        {r.rating}
                      </span>
                      <span className="text-xs text-fg-secondary ml-auto">{r.date}</span>
                    </div>
                    <p className="text-sm text-fg-primary leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>
        </Tabs.Root>

        {/* T288 — temporadas/episódios reais (só séries; ausência graciosa). */}
        {media.type === "series" && <SeasonTabs midiaId={media.id} />}
      </div>
    </article>
  );
}

function SynopsisBlock({ synopsis }: { synopsis: string }) {
  const t = useTranslations("catalog");
  const [expanded, setExpanded] = useState(false);
  const longEnough = synopsis.length > 250;

  if (!synopsis) {
    return <EmptySection message={t("synopsisUnavailable")} />;
  }

  return (
    <div>
      <p
        className={`text-fg-primary leading-relaxed text-base ${!expanded && longEnough ? "line-clamp-4" : ""}`}
      >
        {synopsis}
      </p>
      {longEnough && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-accent-indigo hover:underline mt-1 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-indigo focus:ring-offset-2 focus:ring-offset-surface-bg rounded"
        >
          {expanded ? t("readLess") : t("readMore")}
        </button>
      )}
    </div>
  );
}

function ShareButton() {
  const t = useTranslations("catalog");
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      try {
        await navigator.share({ url });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // fallback
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard may fail
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare} aria-label={t("share")}>
      {copied ? t("linkCopied") : t("share")}
    </Button>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="bg-surface-card rounded-lg border border-[rgba(129,140,248,0.08)] p-8 text-center">
      <svg
        className="w-8 h-8 text-fg-secondary mx-auto mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-sm text-fg-secondary">{message}</p>
    </div>
  );
}
