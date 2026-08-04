"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { api } from "@/lib/http";
import { ProtectedPage } from "@/components/ProtectedPage";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { CatalogSkeleton } from "@/components/CatalogSkeleton";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/use-auth-store";

interface HistoricoItem {
  midia_id: string;
  viewed_at: string;
  titulo: string | null;
  tipo: string | null;
  ano_lancamento: number | null;
  imagem_url: string | null;
  score: number | null;
}

interface HistoricoResponse {
  items: HistoricoItem[];
  limite: number;
  limite_atingido: boolean;
  plano: string;
}

function toMediaItem(i: HistoricoItem): MediaItem {
  const tipo =
    i.tipo === "FILME"
      ? "FILME"
      : i.tipo === "SERIE"
        ? "SERIE"
        : i.tipo === "GAME"
          ? "GAME"
          : "FILME";
  return {
    id: i.midia_id,
    titulo: i.titulo ?? "—",
    tipo,
    ano_lancamento: i.ano_lancamento,
    imagem_url: i.imagem_url,
    score: i.score,
  };
}

export function HistoricoPage() {
  const t = useTranslations("historico");
  const { isAuthenticated } = useAuthStore();
  const [data, setData] = useState<HistoricoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let ativo = true;
    void api
      .get<HistoricoResponse>("/api/v1/historico")
      .then((r) => {
        if (ativo) setData(r);
      })
      .catch((e: Error) => {
        if (ativo) setError(e.message);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [isAuthenticated]);

  return (
    <ProtectedPage>
      <div className="max-w-6xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-2">{t("title")}</h1>

        {loading && <CatalogSkeleton count={6} />}

        {!loading && error && (
          <div className="text-center py-16">
            <p className="text-[#A0A0B8] mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>{t("retry")}</Button>
          </div>
        )}

        {!loading && data && data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[#A0A0B8] mb-4">{t("empty")}</p>
            <Link href="/catalog">
              <Button>{t("exploreCatalog")}</Button>
            </Link>
          </div>
        )}

        {data?.limite_atingido && (
          <div className="mt-4 mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-4 py-3">
            <span className="text-sm text-[#FBBF24]">{t("freeLimit", { count: data.limite })}</span>
            <Link
              href="/pricing"
              className="text-sm font-semibold text-[#818CF8] hover:text-[#A5B4FC]"
            >
              {t("upgrade")}
            </Link>
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
            {data.items.map((item) => (
              <Link
                key={item.midia_id}
                href={`/media/${item.midia_id}`}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8] rounded-md"
              >
                <MediaCard media={toMediaItem(item)} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
