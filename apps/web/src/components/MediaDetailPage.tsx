"use client";

import Image from "next/image";
import { Link } from "@/lib/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { getMediaBySlug, getCatalogSync } from "@/lib/api";
import type { Media } from "@/lib/types";
import { MediaScoreModule } from "./MediaScoreModule";
import { MediaScoreBadge } from "./MediaScoreBadge";
import { Related } from "./Related";
import { AgeRating } from "./AgeRating";
import { ScoreTrend } from "./ScoreTrend";
import { RateLimitedError } from "@/lib/http";
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
  const locale = useLocale();
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
        <EmptyState title="Mídia não encontrada" description="O conteúdo que você procura não existe." action={<Link href="/catalog" className="px-6 py-2 bg-[#818CF8] text-[#0F172A] rounded-lg text-sm font-medium">Explorar catálogo</Link>} />
      </div>
    );
  }

  if (error) {
    return <div className="max-w-5xl mx-auto py-16 px-4"><ErrorState message={error.message} onRetry={() => refetch()} /></div>;
  }

  const tipoLabel = type === "movie" ? "Filmes" : type === "tv" ? "Séries" : "Games";
  const tipoSingular = type === "movie" ? "Filme" : type === "tv" ? "Série" : "Jogo";

  const relatedItems = getCatalogSync({ type: media.type, limit: 6 })
    .items.filter((m) => m.id !== media.id)
    .slice(0, 5)
    .map(toMediaItem);

  return (
    <article className="pb-16">
      {/* Breadcrumbs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <nav className="flex items-center gap-2 text-sm text-[#9CA3AF]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#EDE7DC]">Home</Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-[#EDE7DC]">Catálogo</Link>
          <span>/</span>
          <Link href={`/catalog?type=${media.type}`} className="hover:text-[#EDE7DC]">{tipoLabel}</Link>
          <span>/</span>
          <span className="text-[#EDE7DC] truncate">{media.title}</span>
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
                <Image src={media.posterUrl} alt={`Poster de ${media.title}`} fill className="object-cover rounded-md" sizes="192px" />
              ) : (
                <div className="w-full h-full bg-[#11111E] rounded-md flex items-center justify-center text-[#6B7280]">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <span className="text-xs font-semibold text-[#818CF8] uppercase tracking-widest">{tipoSingular}</span>
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-[#EDE7DC] mt-1 leading-tight">{media.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-[#9CA3AF]">
                  <span>{media.year}</span>
                  {media.duration && <><span>·</span><span>{media.duration}</span></>}
                  <span>·</span><span>{media.genres.slice(0, 3).join(", ")}</span>
                  <AgeRating rating={undefined} type={type === "tv" ? "tv" : type === "movie" ? "movie" : "game"} locale={locale} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                {media.score && <MediaScoreBadge score={media.score.consolidated} />}
                {(media.score as any)?.snapshots && <ScoreTrend snapshots={(media.score as any).snapshots} />}
              </div>
              <MediaScoreModule score={media.score} />
            </div>
          </div>
        </div>
      </div>

      {/* Synopsis + Cast */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-3">{t("synopsis")}</h2>
          {media.synopsis ? (
            <p className="text-[#9CA3AF] leading-relaxed">{media.synopsis}</p>
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

        {media.streaming && media.streaming.length > 0 && (
          <div>
            <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-3">{t("whereToWatch")}</h2>
            <div className="flex flex-wrap gap-2">
              {media.streaming.map((s) => (
                <span key={s.name} className="px-3 py-1.5 bg-[#11111E] border border-[#1C1C2E] rounded-full text-sm text-[#9CA3AF]">{s.name}</span>
              ))}
            </div>
          </div>
        )}

        {relatedItems.length > 0 && <Related items={relatedItems} title="Relacionados" />}

        {/* Related */}
        {children}

        {/* Content-type-specific children (Seasons/Episodes for TV) */}
      </div>
    </article>
  );
}
