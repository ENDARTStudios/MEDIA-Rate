"use client";

/**
 * "Continue a decisão" (Parte 3.1) — para usuários logados.
 *
 * Mostra até 4 itens da watchlist como ponte de retorno. A API da watchlist
 * não expõe score por item (decisão documentada) — o card linka para a
 * ficha técnica, onde o MEDIA Score™ completo está.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores/use-auth-store";
import { api } from "@/lib/http";

interface WatchlistMedia {
  id?: string;
  title?: string;
  posterUrl?: string | null;
  type?: string;
  year?: number | null;
  /** Score consolidado 0–100 (media_score mais recente). */
  score?: number | null;
}

interface WatchlistEntry {
  mediaId?: string;
  midia_id?: string;
  media?: WatchlistMedia | null;
}

const MAX_ITEMS = 4;

export function ContinueDecision() {
  const t = useTranslations("catalog");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [items, setItems] = useState<WatchlistMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let ativo = true;
    void api
      .get<{ items?: WatchlistEntry[] } | WatchlistEntry[]>("/api/v1/watchlist")
      .then((data) => {
        if (!ativo) return;
        const entries = Array.isArray(data) ? data : (data?.items ?? []);
        const medias = entries
          .map((e) => e.media)
          .filter((m): m is WatchlistMedia => !!m?.id && !!m?.title)
          .slice(0, MAX_ITEMS);
        setItems(medias);
      })
      .catch(() => {
        if (ativo) setItems([]);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated || loading || items.length === 0) return null;

  return (
    <section className="py-10 px-4" aria-labelledby="continue-decision-title">
      <div className="max-w-7xl mx-auto">
        <h2
          id="continue-decision-title"
          className="font-heading text-xl font-bold text-[#F5F5F7] uppercase tracking-wider mb-5"
        >
          Continue a decisão
        </h2>
        <ul className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none -mx-4 px-4">
          {items.map((media) => (
            <li key={media.id} className="flex-shrink-0 w-[160px] sm:w-[180px] snap-start">
              <Link
                href={`/media/${media.id}`}
                className="group block rounded-md overflow-hidden border border-[#2A2A3D] bg-[#12121C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
                aria-label={`${media.title} — ${t("mediaScore")}`}
              >
                <div className="aspect-[2/3] bg-[#1B1B2C] relative overflow-hidden">
                  {media.posterUrl ? (
                    <Image
                      src={media.posterUrl}
                      alt={`Capa de ${media.title}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div
                      className="flex h-full items-center justify-center text-[#6B6B85]"
                      aria-hidden="true"
                    >
                      <svg
                        className="h-10 w-10 opacity-50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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
                <div className="p-3">
                  <h3 className="font-heading text-sm font-medium text-[#F5F5F7] truncate">
                    {media.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-[#A0A0B8]">{media.year ?? "—"}</p>
                    {media.score != null && (
                      <span className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#F5F5F7] bg-[#1B1B2C] border border-[#2A2A3D]">
                        {media.score >= 80 ? "🟢" : media.score >= 60 ? "🟡" : "🔴"}{" "}
                        {Math.round(media.score)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
