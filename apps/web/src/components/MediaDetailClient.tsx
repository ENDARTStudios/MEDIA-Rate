"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { getMediaBySlug } from "@/lib/api";
import { MediaScoreModule } from "./MediaScoreModule";
import { Button } from "@/components/ui/button";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { useState } from "react";

export function MediaDetailClient({ slug }: { slug: string }) {
  const t = useTranslations("catalog");
  const { data: media, isLoading, error } = useQuery({ queryKey: ["media", slug], queryFn: () => getMediaBySlug(slug) });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-surface-card rounded-2xl" />
          <div className="h-8 w-2/3 bg-surface-card rounded-lg" />
          <div className="h-4 w-1/3 bg-surface-card rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center" role="alert">
        <h2 className="text-xl text-gray-100 mb-4">{t("error")}</h2>
        <Button onClick={() => window.history.back()}>{t("retry")}</Button>
      </div>
    );
  }

  const tipoLabel = media.type === "movie" ? t("filme") : media.type === "series" ? t("serie") : media.type === "game" ? t("game") : media.type === "comic" ? t("comic") : t("livro");

  return (
    <article>
      {/* Hero */}
      <div className="relative bg-surface-elevated overflow-hidden">
        {media.backdropUrl && <Image src={media.backdropUrl} alt="" fill className="object-cover opacity-30" priority sizes="100vw" aria-hidden="true" />}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8" aria-label="Breadcrumb">
            <Link href="/catalog" className="hover:text-gray-200 transition-colors">{t("title")}</Link><span aria-hidden="true">/</span>
            <Link href={`/catalog?type=${media.type}`} className="hover:text-gray-200 transition-colors">{tipoLabel}</Link><span aria-hidden="true">/</span>
            <span className="text-gray-200 truncate">{media.title}</span>
          </nav>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="shrink-0 relative w-48 aspect-[2/3]">
              {media.posterUrl ? (
                <Image src={media.posterUrl} alt={`Poster de ${media.title}`} fill className="object-cover rounded-xl shadow-floating" sizes="192px" />
              ) : (
                <div className="w-full h-full bg-surface-card rounded-xl flex items-center justify-center text-gray-600 shadow-floating">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <span className="text-xs font-semibold text-accent-400 uppercase tracking-widest">{tipoLabel}</span>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mt-1 leading-tight">{media.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                  <span>{media.year}</span>{media.duration && <><span aria-hidden="true">·</span><span>{media.duration}</span></>}
                  <span aria-hidden="true">·</span><span>{media.genres.slice(0, 3).join(", ")}</span>
                </div>
              </div>

              {/* Streaming Badges */}
              {media.streaming.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Onde assistir</p>
                  <div className="flex flex-wrap gap-2">
                    {media.streaming.map((s) => (
                      <span key={s.name} className="px-3 py-1.5 bg-surface-card border border-surface-border/30 rounded-lg text-xs text-gray-300 font-medium">
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
          <Tabs.List className="flex border-b border-surface-border/30 mb-8" aria-label="Seções de conteúdo">
            {[
              ["synopsis", "Sinopse"],
              ["cast", "Elenco"],
              ["reviews", "Reviews"],
            ].map(([v, l]) => (
              <Tabs.Trigger
                key={v}
                value={v}
                className="px-4 py-2.5 text-sm text-gray-400 border-b-2 border-transparent data-[state=active]:border-accent-500 data-[state=active]:text-gray-100 transition-colors"
              >
                {l}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="synopsis" className="focus-visible:outline-none">
            <p className="text-gray-300 leading-relaxed text-base">{media.synopsis}</p>
          </Tabs.Content>

          <Tabs.Content value="cast" className="focus-visible:outline-none">
            {media.cast.length === 0 ? (
              <p className="text-gray-500 text-sm">Informações de elenco não disponíveis.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {media.cast.map((c) => (
                  <div key={c.name} className="flex items-center gap-3 p-3 bg-surface-card rounded-xl border border-surface-border/20">
                    <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center text-gray-500 text-sm font-medium">{c.name[0]}</div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-100 truncate font-medium">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.role}</p>
                    </div>
                  </div>
                ))}
                {media.crew.map((c) => (
                  <div key={c.name + c.role} className="flex items-center gap-3 p-3 bg-surface-card rounded-xl border border-surface-border/20 opacity-60">
                    <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center text-gray-500 text-sm font-medium">{c.name[0]}</div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-300 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="reviews" className="focus-visible:outline-none">
            {media.reviews.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma review disponível.</p>
            ) : (
              <div className="space-y-4">
                {media.reviews.map((r) => (
                  <div key={r.author + r.date} className="p-4 bg-surface-card rounded-xl border border-surface-border/20">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-gray-100 font-medium">{r.author}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: r.rating >= 80 ? "#22C55E20" : "#EAB30820", color: r.rating >= 80 ? "#22C55E" : "#EAB308" }}>{r.rating}</span>
                      <span className="text-xs text-gray-500 ml-auto">{r.date}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{r.text}</p>
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
  const t = useTranslations("catalog");
  const { columns, addToColumn, removeItem } = useWatchlistStore();
  const [selected, setSelected] = useState("want");
  const [open, setOpen] = useState(false);

  const isInWatchlist = Object.values(columns).some((c) => c.items.includes(mediaId));
  const currentCol = Object.entries(columns).find(([, c]) => c.items.includes(mediaId))?.[0];

  const cols = { want: "Quero ver", watching: "Assistindo", completed: "Completo", dropped: "Abandonado" };

  if (isInWatchlist) {
    return (
      <Button onClick={() => { currentCol && removeItem(currentCol, mediaId); }} variant="secondary" size="sm">
        ✓ Na watchlist ({cols[currentCol as keyof typeof cols] ?? cols.want})
      </Button>
    );
  }

  return (
    <div className="relative inline-block">
      <Button onClick={() => setOpen(!open)} variant="default" size="sm">
        + Watchlist
      </Button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-surface-card border border-surface-border/30 rounded-xl shadow-floating py-1 min-w-[180px] z-dropdown" onMouseLeave={() => setOpen(false)}>
          {Object.entries(cols).map(([k, v]) => (
            <button
              key={k}
              onClick={() => { addToColumn(k, mediaId); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-surface-elevated transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteButton({ mediaId }: { mediaId: string }) {
  const [fav, setFav] = useState(false);
  return <Button onClick={() => setFav(!fav)} variant="outline" size="sm">{fav ? "♥ Favorito" : "♡ Favoritar"}</Button>;
}
