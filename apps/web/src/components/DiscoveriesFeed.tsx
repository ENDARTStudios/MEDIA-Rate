"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { api } from "@/lib/http";
import { getCatalog } from "@/lib/api";
import type { Media } from "@/lib/types";
import { useAuthStore } from "@/stores/use-auth-store";
import { isLocalSource, localSrcSet, remoteLadder } from "@/lib/image-policy";

/**
 * T031/T036 — pôster estático: ladder local ou remota via <img>; sem ladder
 * pública → next/image com bypass. Zero transformação runtime em qualquer
 * caminho. O pai (relative) + sizes vêm de cada chamada.
 */
function StaticPoster({
  src,
  alt,
  sizes,
  imgClass = "absolute inset-0 h-full w-full object-cover",
}: {
  src: string;
  alt: string;
  sizes: string;
  imgClass?: string;
}) {
  if (isLocalSource(src)) {
    return <img src={src} srcSet={localSrcSet(src)} alt={alt} sizes={sizes} className={imgClass} />;
  }
  const ladder = remoteLadder(src);
  if (ladder) {
    return (
      <img src={ladder.src} srcSet={ladder.srcSet} alt={alt} sizes={sizes} className={imgClass} />
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" unoptimized />;
}
import { useRouter } from "@/lib/navigation";

interface MidiaDescoberta {
  id: string;
  titulo: string;
  tipo: string;
  imagemUrl: string | null;
  score: number | null;
}

interface Descoberta {
  fromMediaId: string;
  toMediaId: string;
  relationType: string;
  discoveredAt: string;
  fromMedia: MidiaDescoberta;
  toMedia: MidiaDescoberta;
}

interface GrafoSugestao {
  id: string;
  titulo: string;
  tipo: string;
  ano: number | null;
  poster_url: string | null;
  score: number | null;
  motivo: "franquia" | "adaptacao" | "autor" | "genero";
}

/** T286 — feed "Descobertas" (GET /api/v1/discoveries, T201+T286):
 *  obra descoberta (toMedia) + contexto "porque você gostou de X".
 *  T387b — recomendações por grafo (GET /premium/graph) com chips. */
export function DiscoveriesFeed() {
  const t = useTranslations("discoveries");
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [items, setItems] = useState<Descoberta[]>([]);
  const [grafo, setGrafo] = useState<GrafoSugestao[]>([]);
  const [highlights, setHighlights] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const data = await api.get<Descoberta[]>("/api/v1/discoveries");
      setItems(Array.isArray(data) ? data : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // T387b: grafo de relações (qualquer plano).
    api
      .get<{ recomendacoes: GrafoSugestao[] }>("/api/v1/premium/graph")
      .then((r) => setGrafo(r.recomendacoes ?? []))
      .catch(() => setGrafo([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void carregar();
  }, [isAuthenticated, carregar]);

  // T381: fallback útil quando o usuário ainda não tem descobertas —
  // destaques por score do catálogo (nunca tela morta).
  useEffect(() => {
    if (!isAuthenticated || items.length > 0) return;
    getCatalog({ sort: "score", order: "desc", limit: 6 })
      .then((r) => setHighlights(r.items))
      .catch(() => setHighlights([]));
  }, [isAuthenticated, items.length]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-8 text-center text-[#9CA3AF]">
        <p className="mb-3">{t("loginHint")}</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-lg bg-[#E11D48] px-4 py-2 text-sm font-medium text-white hover:bg-[#C31442]"
        >
          {t("login")}
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="text-[#9CA3AF] py-8">{t("loading")}</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
        {t("error")}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <div className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-8 text-center text-[#9CA3AF]">
          <p className="text-lg font-medium text-[#EDE7DC] mb-1">{t("emptyTitle")}</p>
          <p className="mb-4">{t("emptyHint")}</p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 rounded-lg bg-[#818CF8] px-6 py-2.5 text-sm font-semibold text-[#0F172A] transition-all hover:brightness-110"
          >
            {t("exploreCatalog")}
          </Link>
        </div>

        {grafo.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 font-heading text-lg font-semibold text-[#F5F5F7]">
              {t("fallbackTitle")}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grafo.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/media/${g.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-[#2A2A3D] bg-[#11111E] p-3 transition-colors hover:border-[#818CF8]/50"
                  >
                    <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-[#1C1C2E]">
                      {g.poster_url ? (
                        <StaticPoster src={g.poster_url} alt={g.titulo} sizes="56px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[#6B6B85]">
                          {g.titulo.slice(0, 3).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#EDE7DC]">{g.titulo}</p>
                      <span className="mt-1 inline-block rounded-full border border-[#818CF8]/30 bg-[#818CF8]/10 px-2 py-0.5 text-xs text-[#A5B0FF]">
                        {t(`motivo_${g.motivo}`)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {highlights.length > 0 && (
          <div className="mt-8">
            <h2 className="font-heading text-lg font-semibold text-[#F5F5F7]">
              {t("fallbackTitle")}
            </h2>
            <p className="mb-4 text-sm text-[#A0A0B8]">{t("fallbackHint")}</p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/media/${h.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-[#2A2A3D] bg-[#11111E] p-3 transition-colors hover:border-[#818CF8]/50"
                  >
                    <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-[#1C1C2E]">
                      {h.posterUrl ? (
                        <StaticPoster src={h.posterUrl} alt={h.title} sizes="56px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[#6B6B85]">
                          {h.title.slice(0, 3).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#EDE7DC]">{h.title}</p>
                      <p className="text-xs text-[#80809B]">
                        {h.type} · {h.year}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li
          key={`${item.toMediaId}-${item.relationType}`}
          className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-4 flex flex-col"
          data-testid="discovery-card"
        >
          <a
            href={`/media/${item.toMediaId}`}
            className="group flex items-start gap-3"
            aria-label={`${item.toMedia.titulo} — ${t("relatedTo", { titulo: item.fromMedia.titulo })}`}
          >
            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md bg-[#1C1C2E]">
              {item.toMedia.imagemUrl ? (
                <StaticPoster
                  src={item.toMedia.imagemUrl}
                  alt={item.toMedia.titulo}
                  sizes="80px"
                  imgClass="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#6B6B85]">
                  {item.toMedia.titulo.slice(0, 3).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-[#EDE7DC]">{item.toMedia.titulo}</p>
              <p className="text-xs text-[#9CA3AF] mb-1">
                {t(`relation_${item.relationType.toLowerCase()}`)}
              </p>
              <p className="text-xs text-[#80809B]">
                {t("relatedTo", { titulo: item.fromMedia.titulo })}
              </p>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
