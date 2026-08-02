"use client";

import Image from "next/image";
import { useState } from "react";
import { Link } from "@/lib/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { getMediaBySlug, getCatalogSync } from "@/lib/api";
import type { Media } from "@/lib/types";
import { MediaScoreModule } from "./MediaScoreModule";
import { MediaScoreBadge } from "./MediaScoreBadge";
import { Related } from "./Related";
import { ScoreTrend } from "./ScoreTrend";
import { RateLimitedError } from "@/lib/http";
import { genreSlug, titleForLocale, synopsisForLocale } from "@/lib/i18n-content";
import { RateLimited } from "@/components/ui/rate-limited";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import type { MediaItem } from "./MediaCard";
import type { ReactNode } from "react";

function toMediaItem(m: Media): MediaItem {
  return {
    id: m.id,
    titulo: m.title,
    tipo: m.type === "movie" ? "FILME" : m.type === "series" ? "SERIE" : "GAME",
    ano_lancamento: m.year,
    imagem_url: m.posterUrl,
    score: m.score?.consolidated ?? null,
  };
}

interface MediaDetailPageProps {
  id: string;
  type: "movie" | "tv" | "game";
  children?: ReactNode;
}

export function MediaDetailPage({ id, type, children }: MediaDetailPageProps) {
  const t = useTranslations("catalog");
  const tg = useTranslations("genres");
  const locale = useLocale();
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [shared, setShared] = useState(false);
  const { data: media, isLoading, error, refetch } = useQuery({
    queryKey: ["media", id],
    queryFn: () => getMediaBySlug(id),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-[#11111E] rounded-md" />
          <div className="h-8 w-2/3 bg-[#11111E] rounded-lg" />
          <div className="h-4 w-1/3 bg-[#11111E] rounded-lg" />
        </div>
      </div>
    );
  }

  if (error instanceof RateLimitedError) {
    return <div className="max-w-5xl mx-auto py-16 px-4"><RateLimited retryAfterSeconds={error.retryAfterSeconds} onRetry={() => refetch()} /></div>;
  }

  if (!media) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4">
        <EmptyState title={t("notFoundTitle")} description={t("notFoundDesc")} action={<Link href="/catalog" className="px-6 py-2 bg-[#818CF8] text-[#0F172A] rounded-lg text-sm font-medium">{t("exploreCatalog")}</Link>} />
      </div>
    );
  }

  if (error) {
    return <div className="max-w-5xl mx-auto py-16 px-4"><ErrorState message={error.message} onRetry={() => refetch()} /></div>;
  }

  const tipoLabel = type === "movie" ? t("filme") : type === "tv" ? t("serie") : t("game");

  const relatedItems = getCatalogSync({ type: media.type, limit: 6 })
    .items.filter((m) => m.id !== media.id)
    .slice(0, 5)
    .map(toMediaItem);

  return (
    <article className="pb-16">
      {/* Breadcrumbs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <nav className="flex items-center gap-2 text-sm text-[#9CA3AF]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#EDE7DC]">{t("home")}</Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-[#EDE7DC]">{t("title")}</Link>
          <span>/</span>
          <Link href={`/catalog?type=${media.type}`} className="hover:text-[#EDE7DC]">{tipoLabel}</Link>
          <span>/</span>
          <span className="text-[#EDE7DC] truncate">{titleForLocale(media, locale)}</span>
        </nav>
      </div>

      {/* Hero */}
      <div className="relative bg-[#11111E] overflow-hidden">
        {media.backdropUrl && <Image src={media.backdropUrl} alt="" fill className="object-cover opacity-30" priority sizes="100vw" />}
        <div className="absolute inset-0 bg-gradient-to-br from-[#11111E]/90 to-[#09090F]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090F] via-[#09090F]/60 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="shrink-0 relative w-48 aspect-[2/3]">
              {media.posterUrl ? (
                <Image src={media.posterUrl} alt={`Poster de ${titleForLocale(media, locale)}`} fill className="object-cover rounded-md" sizes="192px" />
              ) : (
                <div className="w-full h-full bg-[#11111E] rounded-md flex items-center justify-center text-[#6B7280]">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <span className="text-xs font-semibold text-[#818CF8] uppercase tracking-widest">{tipoLabel}</span>
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-[#EDE7DC] mt-1 leading-tight">{titleForLocale(media, locale)}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-[#9CA3AF]">
                  <span>{media.year}</span>
                  {media.duration && <><span>·</span><span>{media.duration}</span></>}
                  <span>·</span><span>{media.genres.slice(0, 3).map(g => tg(genreSlug(g))).join(", ")}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {media.score && <MediaScoreBadge score={media.score.consolidated} />}
                {(media.score as any)?.snapshots && <ScoreTrend snapshots={(media.score as any).snapshots} />}
                <button
                  onClick={async () => {
                    const url = window.location.href;
                    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
                    if (isMobile && navigator.share) {
                      try {
                        await navigator.share({ title: media.title, url });
                        setShared(true);
                        setTimeout(() => setShared(false), 2000);
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
                    setShared(true);
                    setTimeout(() => setShared(false), 2000);
                  }}
                  className="text-xs text-[#6B7280] hover:text-[#818CF8] transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-2 focus:ring-offset-[#09090F] rounded"
                  title={t("share")}
                  aria-label={t("share")}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {shared ? t("linkCopied") : t("share")}
                </button>
              </div>
              <MediaScoreModule score={media.score} mediaType={media.type} />
            </div>
          </div>
        </div>
      </div>

      {/* Synopsis + Cast */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-3">{t("synopsis")}</h2>
          {media.synopsis ? (
            <div>
              <p className={`text-[#9CA3AF] leading-relaxed ${synopsisExpanded ? "" : "line-clamp-3"}`}>
                {synopsisForLocale(media, locale)}
              </p>
              {media.synopsis.length > 200 && (
                <button
                  onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                  className="text-sm text-[#818CF8] hover:underline mt-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-2 focus:ring-offset-[#09090F] rounded"
                >
                  {synopsisExpanded ? t("readLess") : t("readMore")}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#6B7280] italic">{t("synopsisUnavailable")}</p>
          )}
        </div>

        {media.cast.length > 0 ? (
          <div>
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-3">{t("cast")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {media.cast.map((c) => (
                <div key={c.name} className="flex items-center gap-3 p-3 bg-[#11111E] rounded-md border border-[#1C1C2E]">
                  <div className="w-9 h-9 rounded-full bg-[#1C1C2E] flex items-center justify-center text-[#6B7280] text-xs font-bold">{c.name[0]}</div>
                  <div className="min-w-0">
                    <p className="text-sm text-[#EDE7DC] truncate">{c.name}</p>
                    <p className="text-xs text-[#6B7280] truncate">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#11111E] rounded-lg border border-[#1C1C2E] p-6 text-center">
            <p className="text-sm text-[#6B7280]">{t("castUnavailable")}</p>
          </div>
        )}

        {media.streaming && media.streaming.length > 0 ? (
          <div>
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-3">{media.type === "game" ? t("whereToPlay") : t("whereToWatch")}</h2>
            <div className="flex flex-wrap gap-2">
              {media.streaming.map((s) => (
                <span key={s.name} className="px-3 py-1.5 bg-[#11111E] border border-[#1C1C2E] rounded-full text-sm text-[#9CA3AF]">{s.name}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#11111E] rounded-lg border border-[#1C1C2E] p-6 text-center">
            <svg className="w-8 h-8 text-[#6B7280] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-[#6B7280]">{media.type === "game" ? t("streamingUnavailableGame") : t("streamingUnavailable")}</p>
          </div>
        )}

        {relatedItems.length > 0 && <Related items={relatedItems} title={t("related")} />}

        {children}
      </div>
    </article>
  );
}
