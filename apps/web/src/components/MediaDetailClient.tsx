"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { getMediaBySlug } from "@/lib/api";
import type { Media } from "@/lib/types";
import { MediaScoreModule } from "./MediaScoreModule";
import { Button } from "@/components/ui/button";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { useEffect, useState } from "react";
import { RateLimitedError } from "@/lib/http";
import { RateLimited } from "@/components/ui/rate-limited";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export function MediaDetailClient({ slug, initialData }: { slug: string; initialData?: Media | null }) {
  const t = useTranslations("catalog");
  const { data: media, isLoading, error, refetch } = useQuery({ queryKey: ["media", slug], queryFn: () => getMediaBySlug(slug), initialData });

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
          title="Mídia não encontrada"
          description="O conteúdo que você procura não existe ou foi removido."
          action={<a href="/catalog" className="px-6 py-2 bg-[#818CF8] text-[#0F172A] rounded-lg text-sm font-medium hover:brightness-110 transition-colors">Explorar catálogo</a>}
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

  const tipoLabel = media.type === "movie" ? t("filme") : media.type === "series" ? t("serie") : media.type === "game" ? t("game") : media.type === "comic" ? t("comic") : t("livro");

  return (
    <article>
      {/* Hero */}
      <div className="relative bg-[#11111E] overflow-hidden">
        {media.backdropUrl && <Image src={media.backdropUrl} alt="" fill className="object-cover opacity-30" priority sizes="100vw" aria-hidden="true" />}
        <div className="absolute inset-0 bg-gradient-to-br from-[#11111E]/90 to-[#09090F]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090F] via-[#09090F]/60 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <nav className="flex items-center gap-2 text-sm text-[#9CA3AF] mb-8" aria-label="Breadcrumb">
            <Link href="/catalog" className="hover:text-[#EDE7DC] transition-colors">{t("title")}</Link><span aria-hidden="true">/</span>
            <Link href={`/catalog?type=${media.type}`} className="hover:text-[#EDE7DC] transition-colors">{tipoLabel}</Link><span aria-hidden="true">/</span>
            <span className="text-[#EDE7DC] truncate">{media.title}</span>
          </nav>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="shrink-0 relative w-48 aspect-[2/3]">
              {media.posterUrl ? (
                <Image src={media.posterUrl} alt={`Poster de ${media.title}`} fill className="object-cover rounded-md shadow-surface-2" sizes="192px" />
              ) : (
                <div className="w-full h-full bg-[#11111E] rounded-md flex items-center justify-center text-[#6B7280] shadow-surface-2">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <span className="text-xs font-semibold text-[#818CF8] uppercase tracking-widest">{tipoLabel}</span>
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-[#EDE7DC] mt-1 leading-tight">{media.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-[#9CA3AF]">
                  <span>{media.year}</span>{media.duration && <><span aria-hidden="true">·</span><span>{media.duration}</span></>}
                  <span aria-hidden="true">·</span><span>{media.genres.slice(0, 3).join(", ")}</span>
                </div>
              </div>

              {/* Streaming Badges */}
              {media.streaming.length > 0 && (
                <div>
                  <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider mb-2">Onde assistir</p>
                  <div className="flex flex-wrap gap-2">
                    {media.streaming.map((s) => (
                      <span key={s.name} className="px-3 py-1.5 bg-[#11111E] border border-[rgba(129,140,248,0.08)] rounded-lg text-xs text-[#EDE7DC] font-medium">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <WatchlistButton mediaId={media.id} />
                <FavoriteButton mediaId={media.id} />
                <Button variant="outline" size="sm" disabled aria-label="Compartilhar">{t("share")}</Button>
              </div>
              <MediaScoreModule score={media.score} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs.Root defaultValue="synopsis">
          <Tabs.List className="flex border-b border-[rgba(129,140,248,0.08)] mb-8" aria-label="Seções de conteúdo">
            {[
              ["synopsis", "Sinopse"],
              ["cast", "Elenco"],
              ["reviews", "Reviews"],
            ].map(([v, l]) => (
              <Tabs.Trigger
                key={v}
                value={v}
                className="px-4 py-2.5 text-sm text-[#9CA3AF] border-b-2 border-transparent data-[state=active]:border-accent-500 data-[state=active]:text-[#EDE7DC] transition-colors"
              >
                {l}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="synopsis" className="focus-visible:outline-none">
            <p className="text-[#EDE7DC] leading-relaxed text-base">{media.synopsis}</p>
          </Tabs.Content>

          <Tabs.Content value="cast" className="focus-visible:outline-none">
            {media.cast.length === 0 ? (
              <p className="text-[#6B7280] text-sm">Informações de elenco não disponíveis.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {media.cast.map((c) => (
                  <div key={c.name} className="flex items-center gap-3 p-3 bg-[#11111E] rounded-md border border-surface-border/20">
                    <div className="w-10 h-10 rounded-full bg-[#11111E] flex items-center justify-center text-[#6B7280] text-sm font-medium">{c.name[0]}</div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#EDE7DC] truncate font-medium">{c.name}</p>
                      <p className="text-xs text-[#9CA3AF] truncate">{c.role}</p>
                    </div>
                  </div>
                ))}
                {media.crew.map((c) => (
                  <div key={c.name + c.role} className="flex items-center gap-3 p-3 bg-[#11111E] rounded-md border border-surface-border/20 opacity-60">
                    <div className="w-10 h-10 rounded-full bg-[#11111E] flex items-center justify-center text-[#6B7280] text-sm font-medium">{c.name[0]}</div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#EDE7DC] truncate">{c.name}</p>
                      <p className="text-xs text-[#9CA3AF] truncate">{c.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="reviews" className="focus-visible:outline-none">
            {media.reviews.length === 0 ? (
              <p className="text-[#6B7280] text-sm">Nenhuma review disponível.</p>
            ) : (
              <div className="space-y-4">
                {media.reviews.map((r) => (
                  <div key={r.author + r.date} className="p-4 bg-[#11111E] rounded-md border border-surface-border/20">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-[#EDE7DC] font-medium">{r.author}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: r.rating >= 80 ? "#22C55E20" : "#EAB30820", color: r.rating >= 80 ? "#22C55E" : "#EAB308" }}>{r.rating}</span>
                      <span className="text-xs text-[#6B7280] ml-auto">{r.date}</span>
                    </div>
                    <p className="text-sm text-[#EDE7DC] leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </article>
  );
}

function WatchlistButton({ mediaId }: { mediaId: string }) {
  const { isInWatchlist, getEntryStatus, removeItem, entries } = useWatchlistStore();
  const t = useTranslations("watchlist");
  const [loading, setLoading] = useState(false);
  const inList = isInWatchlist(mediaId);
  const status = getEntryStatus(mediaId);
  const entryId = entries.find(e => e.mediaId === mediaId)?.id;

  if (loading) return <Button disabled variant="secondary" size="sm">...</Button>;
  if (inList && entryId) {
    return (
      <Button onClick={async () => { setLoading(true); try { await removeItem(entryId); } finally { setLoading(false); } }} variant="secondary" size="sm">
        ✓ {status === "WANT" ? t("queroVer") : status === "WATCHING" ? t("vendo") : status === "COMPLETED" ? t("vi") : t("removeFromWatchlist")}
      </Button>
    );
  }
  return null;
}

function FavoriteButton({ mediaId }: { mediaId: string }) {
  const { isInWatchlist, addToWatchlist, removeItem, entries, fetchWatchlist } = useWatchlistStore();
  const [loading, setLoading] = useState(false);
  const [optimisticFav, setOptimisticFav] = useState(false);

  // On mount: fetch to check if already favorited, then sync optimistic state
  useEffect(() => {
    fetchWatchlist().then(() => {
      setOptimisticFav(isInWatchlist(mediaId));
    });
  }, []);

  // Re-sync when entries change (after external add/remove)
  useEffect(() => {
    setOptimisticFav(isInWatchlist(mediaId));
  }, [entries.length]); // Only re-sync on count change, not on every entry object change

  const entryId = entries.find(e => {
    const mId = String(e.mediaId ?? e.midia_id ?? e.media?.id ?? "");
    return mId === mediaId || e.mediaId === mediaId || e.midia_id === mediaId;
  })?.id;

  if (loading) return <Button disabled variant="outline" size="sm">...</Button>;
  if (optimisticFav) {
    return (
      <Button
        onClick={async () => {
          setLoading(true);
          try {
            if (entryId) await removeItem(entryId);
            else await removeItem(mediaId);
          } catch {}
          setOptimisticFav(false);
          setLoading(false);
        }}
        variant="outline" size="sm"
      >
        ♥ Favorito
      </Button>
    );
  }
  return (
    <Button
      onClick={async () => { setLoading(true); try { await addToWatchlist(mediaId, "WANT"); setOptimisticFav(true); } finally { setLoading(false); } }}
      variant="outline" size="sm"
    >
      ♡ Favoritar
    </Button>
  );
}
