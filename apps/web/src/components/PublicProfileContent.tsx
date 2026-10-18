"use client";

import { formatarScoreLocale } from "@/lib/score-utils";

/**
 * PublicProfileContent (Parte 3.6, T193) — página pública de perfil
 * consumindo GET /api/v1/usuarios/:id/stats (agregados apenas — sem dados
 * pessoais sensíveis, por design do endpoint).
 */
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/http";
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
  const locale = useLocale();
  const t = useTranslations("profile");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => api.get<PublicStats>(`/api/v1/usuarios/${userId}/stats`),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center text-fg-secondary">
        {t("loading")}
      </div>
    );
  }

  if (error || !data) {
    // D-628: 404 é estado honesto ("não encontrado"); falha de rede/servidor pede
    // "tentar de novo". Antes tudo caía no mesmo texto — um 500 dizia que o perfil não existe.
    const naoEncontrado = error instanceof ApiError && error.status === 404;
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center" role="alert">
        <p className="text-fg-secondary mb-4">
          {naoEncontrado ? t("publicNotFound") : t("publicLoadError")}
        </p>
        {naoEncontrado ? (
          <Link href="/catalog" className="text-accent-indigo underline underline-offset-2">
            {t("exploreCatalog")}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-md bg-accent-indigo px-4 py-2 text-sm font-semibold text-accent-indigo-foreground hover:brightness-110"
          >
            {t("retry")}
          </button>
        )}
      </div>
    );
  }

  const tipoLabels: Record<string, string> = {
    FILME: t("movies"),
    SERIE: t("series"),
    GAME: t("games"),
  };

  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 rounded-full bg-accent-indigo/20 flex items-center justify-center text-2xl font-heading font-bold text-accent-indigo">
          {data.usuario.nome?.[0] ?? "?"}
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-fg-primary">{data.usuario.nome}</h1>
          <p className="text-sm text-fg-secondary">{t("publicStatsHint")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-surface-border bg-surface-card p-4">
          <p className="text-xs text-fg-secondary">{t("totalWatchlist")}</p>
          <p className="mt-1 text-2xl font-heading font-bold tabular-nums text-fg-primary">
            {data.total}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-card p-4">
          <p className="text-xs text-fg-secondary">{t("completed")}</p>
          <p className="mt-1 text-2xl font-heading font-bold tabular-nums text-accent-emerald">
            {data.por_coluna.COMPLETED ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-card p-4">
          <p className="text-xs text-fg-secondary">{t("watching")}</p>
          <p className="mt-1 text-2xl font-heading font-bold tabular-nums text-accent-sky">
            {data.por_coluna.WATCHING ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-card p-4">
          <p className="text-xs text-fg-secondary">{t("avgScore")}</p>
          <p className="mt-1 text-2xl font-heading font-bold tabular-nums text-accent-amber">
            {data.score_medio != null ? formatarScoreLocale(data.score_medio, locale) : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card p-6 mb-6">
        <h2 className="text-lg font-heading font-semibold text-fg-primary mb-4">
          {t("favoriteGenres")}
        </h2>
        {data.generos_top.length === 0 ? (
          <p className="text-sm text-fg-muted">{t("noData")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.generos_top.map((g) => (
              <span
                key={g.nome}
                className="rounded-full border border-surface-border bg-surface-elevated px-3 py-1 text-xs text-fg-secondary"
              >
                {g.nome} · {g.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card p-6">
        <h2 className="text-lg font-heading font-semibold text-fg-primary mb-4">
          {t("typeDistribution")}
        </h2>
        {data.total === 0 ? (
          <p className="text-sm text-fg-muted">{t("noData")}</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(data.por_tipo).map(([tipo, count]) => {
              const pct = Math.round((count / data.total) * 100);
              return (
                <div key={tipo}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-fg-primary">{tipoLabels[tipo] ?? tipo}</span>
                    <span className="text-fg-secondary tabular-nums">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-indigo"
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
