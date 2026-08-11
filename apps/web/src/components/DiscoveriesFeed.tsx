"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { api } from "@/lib/http";
import { useAuthStore } from "@/stores/use-auth-store";
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

/** T286 — feed "Descobertas" (GET /api/v1/discoveries, T201+T286):
 *  obra descoberta (toMedia) + contexto "porque você gostou de X". */
export function DiscoveriesFeed() {
  const t = useTranslations("discoveries");
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [items, setItems] = useState<Descoberta[]>([]);
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
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void carregar();
  }, [isAuthenticated, carregar]);

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
      <div className="rounded-xl border border-[#2A2A3D] bg-[#11111E] p-8 text-center text-[#9CA3AF]">
        <p className="text-lg font-medium text-[#EDE7DC] mb-1">{t("emptyTitle")}</p>
        <p>{t("emptyHint")}</p>
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
                <Image
                  src={item.toMedia.imagemUrl}
                  alt={item.toMedia.titulo}
                  fill
                  sizes="80px"
                  className="object-cover transition-transform group-hover:scale-105"
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
