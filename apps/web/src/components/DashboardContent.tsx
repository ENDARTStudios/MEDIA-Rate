"use client";

/**
 * Dashboard (Parte 3.4, T189) — cabeçalho pessoal + 4 cards de métrica com
 * micro-gráficos + timeline de consumo (área empilhada) + radar de gosto +
 * calendário de lançamentos. Gráficos (Recharts) carregados via dynamic
 * import ssr:false para não inflar o bundle SSR. Auth-gate via ProtectedPage.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import dynamic from "next/dynamic";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { useAuthStore } from "@/stores/use-auth-store";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { RateLimitedError } from "@/lib/http";
import { RateLimited } from "@/components/ui/rate-limited";
import { ErrorState } from "@/components/ui/error-state";
import { getTasteHistory, type TasteMonth } from "@/lib/api-discoveries";
import { TrendSummaryPhrase } from "./dashboard/TrendSummaryPhrase";

const MetricCards = dynamic(() => import("./dashboard/MetricCards").then((m) => m.MetricCards), {
  ssr: false,
});
const ConsumptionTimeline = dynamic(
  () => import("./dashboard/ConsumptionTimeline").then((m) => m.ConsumptionTimeline),
  { ssr: false },
);
const TasteRadar = dynamic(() => import("./dashboard/TasteRadar").then((m) => m.TasteRadar), {
  ssr: false,
});
const ReleaseCalendar = dynamic(
  () => import("./dashboard/ReleaseCalendar").then((m) => m.ReleaseCalendar),
  { ssr: false },
);
const DiscoveryFeedCard = dynamic(
  () => import("./dashboard/DiscoveryFeedCard").then((m) => m.DiscoveryFeedCard),
  { ssr: false },
);
const TasteEvolutionChart = dynamic(
  () => import("./dashboard/TasteEvolutionChart").then((m) => m.TasteEvolutionChart),
  { ssr: false },
);

const COLUMN_LABELS: Record<string, string> = {
  WANT: "wantToSee",
  WATCHING: "watching",
  COMPLETED: "completed",
  DROPPED: "dropped",
};

const COLUMN_COLORS: Record<string, string> = {
  WANT: "bg-[#38BDF8]",
  WATCHING: "bg-[#818CF8]",
  COMPLETED: "bg-[#34D399]",
  DROPPED: "bg-[#6B7280]",
};

const TYPE_COLORS: Record<string, string> = {
  movie: "#818CF8",
  series: "#38BDF8",
  game: "#34D399",
};

const TYPE_LABEL: Record<string, "movies" | "series" | "games"> = {
  movie: "movies",
  series: "series",
  game: "games",
};

function typeOf(entry: { media?: { type?: string } | null }): string {
  const type = entry.media?.type;
  return type && TYPE_COLORS[type] ? type : "movie";
}

export function DashboardContent() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { entries, isLoading, error, fetchWatchlist } = useWatchlistStore();
  const userName = useAuthStore((s) => s.user?.name ?? null);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // T201 (G4): evolução do gosto (12 meses) para o chart + frase de tendência.
  const [taste, setTaste] = useState<TasteMonth[] | null>(null);
  useEffect(() => {
    let ativo = true;
    void getTasteHistory().then((h) => {
      if (ativo) setTaste(h);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const total = entries.length;
  const statusCounts: Record<string, number> = { WANT: 0, WATCHING: 0, COMPLETED: 0, DROPPED: 0 };
  entries.forEach((e) => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });
  const completedCount = statusCounts.COMPLETED || 0;
  const watchingCount = statusCounts.WATCHING || 0;

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { movie: 0, series: 0, game: 0 };
    entries.forEach((e) => {
      counts[typeOf(e)] = (counts[typeOf(e)] || 0) + 1;
    });
    return counts;
  }, [entries]);

  // Série mensal (últimos 6 meses) — área empilhada + sparklines.
  const monthlySeries = useMemo(() => {
    const now = new Date();
    const months: {
      key: string;
      label: string;
      movie: number;
      series: number;
      game: number;
      total: number;
    }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: new Intl.DateTimeFormat(locale, { month: "short" }).format(d),
        movie: 0,
        series: 0,
        game: 0,
        total: 0,
      });
    }
    entries.forEach((e) => {
      const added = e.addedAt ?? e.created_at;
      if (!added) return;
      const d = new Date(added);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (!bucket) return;
      const type = typeOf(e);
      bucket[type as "movie" | "series" | "game"] += 1;
      bucket.total += 1;
    });
    return months;
  }, [entries, locale]);

  const radarData = useMemo(
    () =>
      (["movie", "series", "game"] as const).map((type) => ({
        axis: t(TYPE_LABEL[type]),
        value: typeCounts[type] || 0,
      })),
    [typeCounts, t],
  );

  const favoriteType = (["movie", "series", "game"] as const).reduce((a, b) =>
    (typeCounts[a] || 0) >= (typeCounts[b] || 0) ? a : b,
  );
  const pieData = (["movie", "series", "game"] as const).map((type) => ({
    name: t(TYPE_LABEL[type]),
    value: typeCounts[type] || 0,
  }));

  // Lançamentos nos próximos 30 dias (datas reais quando houver; sem data → 0 honesto).
  const lancamentos30d = useMemo(() => {
    const agora = Date.now();
    const limite = agora + 30 * 24 * 3600 * 1000;
    return entries.filter((e) => {
      const data = (e.media as { releaseDate?: string } | null | undefined)?.releaseDate;
      if (!data) return false;
      const t0 = new Date(data).getTime();
      return t0 >= agora && t0 <= limite;
    }).length;
  }, [entries]);

  if (isLoading && total === 0) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center">
        <p className="text-[#9CA3AF]">{t("loading")}</p>
      </div>
    );
  }

  if (error instanceof RateLimitedError) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4">
        <RateLimited retryAfterSeconds={error.retryAfterSeconds} onRetry={() => fetchWatchlist()} />
      </div>
    );
  }

  if (error && total === 0) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4">
        <ErrorState message={String(error)} onRetry={() => fetchWatchlist()} />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-4">{t("title")}</h1>
        <p className="text-[#A0A0B8] mb-6">{t("emptyDesc")}</p>
        <Link href="/catalog">
          <Button>{t("exploreCatalog")}</Button>
        </Link>
      </div>
    );
  }

  const metricCards = [
    {
      label: t("totalWatchlist"),
      value: total,
      color: "#818CF8",
      note: t("titulos"),
      spark: monthlySeries.map((m) => ({ v: m.total })),
    },
    {
      label: t("watchingNow"),
      value: watchingCount,
      color: "#38BDF8",
      note: t("inProgress"),
      spark: monthlySeries.map((m) => ({ v: m.series + m.movie })),
    },
    {
      label: t("completed"),
      value: completedCount,
      color: "#34D399",
      note: t("concluidos"),
      spark: monthlySeries.map((m) => ({ v: m.game })),
    },
    {
      label: t("favoriteType"),
      value: t(TYPE_LABEL[favoriteType]),
      color: TYPE_COLORS[favoriteType],
      note: `${t("titulos")}: ${typeCounts[favoriteType]}`,
      donut: pieData,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      {/* Cabeçalho pessoal */}
      <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-2">
        {userName ? t("greeting", { name: userName }) : t("title")}
      </h1>
      <p className="text-sm text-[#A0A0B8] mb-8">
        {t("summary", { total, lancamentos: lancamentos30d })}
      </p>

      {/* T201 (G4): resumo de descobertas cross-mídia no topo do dashboard. */}
      <DiscoveryFeedCard />

      <MetricCards cards={metricCards} />

      <ConsumptionTimeline
        data={monthlySeries}
        title={t("tasteEvolution")}
        emptyMessage={t("tasteEvolutionDesc")}
        labels={{ movie: t("movies"), series: t("series"), game: t("games") }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Distribuição por status */}
        <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6">
          <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-6">
            {t("statusDistribution")}
          </h2>
          <div className="space-y-4">
            {Object.entries(COLUMN_LABELS).map(([status, labelKey]) => {
              const count = statusCounts[status] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#F5F5F7]">{t(labelKey)}</span>
                    <span className="text-[#A0A0B8] tabular-nums">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1B1B2C] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${COLUMN_COLORS[status]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <TasteRadar data={radarData} title={t("tasteProfile")} note={t("tasteProfileNote")} />
      </div>

      {/* T201 (G4): evolução do gosto por gênero (12 meses) + frase de tendência. */}
      <div
        className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6 mb-10"
        data-testid="taste-evolution-card"
      >
        <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-1">
          {t("tasteEvolutionGenre")}
        </h2>
        <div className="mb-4">
          <TrendSummaryPhrase data={taste} />
        </div>
        <TasteEvolutionChart data={taste} />
      </div>

      <ReleaseCalendar items={[]} title={t("releases")} emptyMessage={t("releasesEmpty")} />
    </div>
  );
}
