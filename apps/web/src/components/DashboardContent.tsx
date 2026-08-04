"use client";

import { useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useWatchlistStore } from "@/stores/use-watchlist-store";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { RateLimitedError } from "@/lib/http";
import { RateLimited } from "@/components/ui/rate-limited";
import { ErrorState } from "@/components/ui/error-state";
import { Area, AreaChart, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { TasteRadarChart } from "@/components/media-rate-ui/TasteRadarChart";
import { ReleaseTimeline } from "@/components/media-rate-ui/ReleaseTimeline";

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

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

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

  // Série mensal (últimos 6 meses) de itens adicionados, por tipo — área
  // empilhada + sparklines dos cards de métrica.
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
      spark: [],
      donut: pieData,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-2">{t("title")}</h1>
      <p className="text-sm text-[#A0A0B8] mb-8">
        {t("totalWatchlist")}: {total} {t("titulos")} · {t("watchingNow")}: {watchingCount}
      </p>

      {/* 4 cards de métrica com micro-gráfico */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {metricCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-4">
            <p className="text-xs text-[#A0A0B8] uppercase tracking-wider mb-2">{card.label}</p>
            <p
              className="text-3xl font-heading font-bold tabular-nums"
              style={{ color: card.color }}
            >
              {card.value}
            </p>
            <p className="text-xs text-[#6B6B85] mt-1">{card.note}</p>
            <div className="mt-3 h-8">
              {card.donut ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={card.donut}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="85%"
                      isAnimationActive={false}
                    >
                      {card.donut.map((d) => (
                        <Cell key={d.name} fill={TYPE_COLORS[d.name.toLowerCase()] ?? "#818CF8"} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : card.spark.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={card.spark}>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={card.color}
                      fill={card.color}
                      fillOpacity={0.15}
                      strokeWidth={1.5}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico principal: consumo por mês (área empilhada por tipo) */}
      <div className="mb-10 rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6">
        <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-6">
          {t("tasteEvolution")}
        </h2>
        {monthlySeries.every((m) => m.total === 0) ? (
          <p className="text-sm text-[#6B6B85] text-center py-8">{t("tasteEvolutionDesc")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlySeries}>
              <defs>
                {(["movie", "series", "game"] as const).map((type) => (
                  <linearGradient key={type} id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TYPE_COLORS[type]} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={TYPE_COLORS[type]} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <Tooltip
                contentStyle={{
                  background: "#1B1B2C",
                  border: "1px solid #2A2A3D",
                  borderRadius: 8,
                  color: "#F5F5F7",
                }}
              />
              {(["movie", "series", "game"] as const).map((type) => (
                <Area
                  key={type}
                  type="monotone"
                  dataKey={type}
                  stackId="1"
                  stroke={TYPE_COLORS[type]}
                  fill={`url(#grad-${type})`}
                  strokeWidth={1.5}
                  name={t(TYPE_LABEL[type])}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Status */}
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

        {/* Radar — perfil (distribuição por tipo; gêneros quando houver dados) */}
        <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6">
          <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
            {t("tasteProfile")}
          </h2>
          <TasteRadarChart data={radarData} color="#818CF8" />
          <p className="mt-2 text-[11px] text-[#6B6B85]">
            Perfil por tipo de mídia — gêneros (Ação/Drama/...) chegam com os dados do catálogo.
          </p>
        </div>
      </div>

      {/* Calendário de lançamentos — vazio gracioso (sem datas de estreia no modelo) */}
      <div className="rounded-lg border border-[#2A2A3D] bg-[#12121C] p-6">
        <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
          Calendário de lançamentos
        </h2>
        <ReleaseTimeline items={[]} />
      </div>
    </div>
  );
}
