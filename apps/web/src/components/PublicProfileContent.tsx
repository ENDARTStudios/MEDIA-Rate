"use client";

/**
 * PublicProfileContent (Parte 3.6, T193) — página pública de perfil
 * consumindo GET /api/v1/usuarios/:id/stats (agregados apenas — sem dados
 * pessoais sensíveis, por design do endpoint).
 */
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/http";
import { Link } from "@/lib/navigation";

interface PublicStats {
  usuario: { id: string; nome: string };
  total: number;
  por_tipo: Record<string, number>;
  por_coluna: Record<string, number>;
  generos_top: { nome: string; count: number }[];
  score_medio: number | null;
}

export function PublicProfileContent({ userId }: { userId: string }) {
  const t = useTranslations("profile");
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => api.get<PublicStats>(`/api/v1/usuarios/${userId}/stats`),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center text-[#9CA3AF]">
        {t("loading")}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center" role="alert">
        <p className="text-[#A0A0B8] mb-4">{t("publicNotFound")}</p>
        <Link href="/catalog" className="text-[#818CF8] underline underline-offset-2">
          {t("exploreCatalog")}
        </Link>
      </div>
    );
  }

  const tipoLabels: Record<string, string> = { FILME: t("movies"), SERIE: t("series"), GAME: t("games") };
  const colunaLabels: Record<string, string> = {
    WANT: t("wantToSee"),
    WATCHING: t("watching"),
    COMPLETED: t("completed"),
    DROPPED: t("dropped"),
  };

  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 rounded-full bg-[#818CF8]/20 flex items-center justify-center text-2xl font-heading font-bold text-[#818CF8]">
          {data.usuario.nome?.[0] ?? "?"}
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#EDE7DC]">{data.usuario.nome}</h1>
          <p className="text-sm text-[#A0A0B8]">{t("publicStatsHint")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-4">
          <p className="text-xs text-[#A0A0B8]">{t("totalWatchlist")}</p>
          <p className="mt-1 text-2xl font-heading font-bold tabular-nums text-[#F5F5F7]">
            {data.total}
          </p>
        </div>
        <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-4">
          <p className="text-xs text-[#A0A0B8]">{t("completed")}</p>
          <p className="mt-1 text-2xl font-heading font-bold tabular-nums text-[#34D399]">
            {data.por_coluna.COMPLETED ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-4">
          <p className="text-xs text-[#A0A0B8]">{t("watching")}</p>
          <p className="mt-1 text-2xl font-heading font-bold tabular-nums text-[#38BDF8]">
            {data.por_coluna.WATCHING ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-4">
          <p className="text-xs text-[#A0A0B8]">{t("avgScore")}</p>
          <p className="mt-1 text-2xl font-heading font-bold tabular-nums text-[#FBBF24]">
            {data.score_medio != null ? data.score_medio.toFixed(1) : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6 mb-6">
        <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
          {t("favoriteGenres")}
        </h2>
        {data.generos_top.length === 0 ? (
          <p className="text-sm text-[#80809B]">{t("noData")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.generos_top.map((g) => (
              <span
                key={g.nome}
                className="rounded-full border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-1 text-xs text-[#A0A0B8]"
              >
                {g.nome} · {g.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6">
        <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
          {t("typeDistribution")}
        </h2>
        {data.total === 0 ? (
          <p className="text-sm text-[#80809B]">{t("noData")}</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(data.por_tipo).map(([tipo, count]) => {
              const pct = Math.round((count / data.total) * 100);
              return (
                <div key={tipo}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#F5F5F7]">{tipoLabels[tipo] ?? tipo}</span>
                    <span className="text-[#A0A0B8] tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1B1B2C] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#818CF8]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
