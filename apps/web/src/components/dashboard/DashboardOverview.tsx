"use client";

import { formatarScoreLocale } from "@/lib/score-utils";

import { DASH } from "@/lib/dashboard-palette";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  Compass,
  Flame,
  Heart,
  Library,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";
import { Link, useRouter } from "@/lib/navigation";
import { getDiscoveries, type Discovery } from "@/lib/api-discoveries";
import { getInteracoes, idadeEmDias, tempoRelativoKey, type Interacao } from "@/lib/api-interacoes";
import {
  ACHIEVEMENT_CATALOG,
  ACTIVITY_FEED,
  DEMO_DISCOVERIES,
  NICHE_ORDER,
  OVERVIEW_PERIODS,
  PERIOD_SERIES,
  TREND_SERIES,
  affinityFromHistograma,
  completionPct,
  formatScoreValue,
  nicheFromApiTipo,
  nicheLabelKey,
  pulseWeekFromEvolucao,
  radarFromStats,
  taxonomyFromStats,
  unlockedNiches,
  type OverviewNiche,
  type OverviewPeriod,
  type RadarAxis,
} from "@/lib/dashboard-overview-data";

interface OverviewStats {
  plano: string;
  total: number;
  concluidos: number;
  tipos: Record<string, number>;
  generos: Record<string, number>;
  evolucao: { mes: string; total: number }[] | null;
  streak: number;
  histograma: { faixa: string; total: number }[];
}

type TrendPeriod = keyof typeof TREND_SERIES;

/** Ajustes de demonstração por nicho (protótipo) p/ séries multi-nicho. */
const NICHE_ADJUSTMENTS: Record<string, { user: number; community: number }> = {
  movie: { user: 0.2, community: 0.1 },
  series: { user: 0.5, community: 0.2 },
  game: { user: -0.1, community: 0.1 },
  book: { user: 0.7, community: 0.3 },
  comic: { user: 0.1, community: 0 },
  manga: { user: 0.35, community: 0.15 },
};

/** Status de consumo → rótulo (chaves i18n da biblioteca) + cor do chip. */
const STATUS_META: Record<Interacao["status"], { labelKey: string; className: string }> = {
  QUERO_CONSUMIR: {
    labelKey: "wantToSee",
    className: "border-dash-blue/25 bg-dash-blue/10 text-dash-blue",
  },
  CONSUMINDO: {
    labelKey: "watching",
    className: "border-dash-indigo/25 bg-dash-indigo/10 text-dash-violet-light",
  },
  CONCLUIDO: {
    labelKey: "completed",
    className: "border-dash-teal/25 bg-dash-teal/10 text-dash-teal",
  },
  ABANDONADO: {
    labelKey: "dropped",
    className: "border-white/15 bg-white/[0.05] text-white/50",
  },
};

// D-586 (T211/B3): helpers extraídos para ./overview/* (movimentação mecânica).
import { nicheIcon, ptNumber, resolveTimeKey } from "./overview/helpers";
import { SectionHead } from "./overview/SectionHead";
import { DemoBadge } from "./overview/DemoBadge";
import { PreviewCard } from "./overview/PreviewCard";
import { MiniSparkline } from "./overview/MiniSparkline";
import { RadarGraphic } from "./overview/RadarGraphic";
import { ScoreBadge } from "./overview/ScoreBadge";
import { HistogramBars } from "./overview/HistogramBars";

export function DashboardOverview({ stats }: { stats: OverviewStats }) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tc = useTranslations("catalog");
  const router = useRouter();
  const [period, setPeriod] = useState<OverviewPeriod>("12 meses");
  const [achievementFilter, setAchievementFilter] = useState("all");
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("12 meses");
  const [selectedNiches, setSelectedNiches] = useState<OverviewNiche[]>([]);
  const [chartMode, setChartMode] = useState<"lines" | "bars">("lines");
  const [compareCommunity, setCompareCommunity] = useState(true);
  const [feedPeriod, setFeedPeriod] = useState<"7" | "30" | "365">("7");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [realDiscoveries, setRealDiscoveries] = useState<Discovery[] | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[] | null>(null);
  const [notice, setNotice] = useState("");

  // Descobertas reais (T201); sem API/dados → dataset de demonstração.
  useEffect(() => {
    let ativo = true;
    void getDiscoveries().then((d) => {
      if (ativo) setRealDiscoveries(d);
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Atividades reais do usuário (status/reação por mídia) p/ o feed.
  // D-525: página única de 50 — feed é recente-first por natureza.
  useEffect(() => {
    let ativo = true;
    void getInteracoes({ limit: 50 }).then((pagina) => {
      if (ativo) setInteracoes(pagina === null ? null : pagina.items);
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Gating T402 (D-378): radar/taxonomia = Plus+; evolução/pulso = Premium
  // (a API já nega os dados server-side — aqui a UI acompanha com preview).
  const ehPlus = stats.plano === "PLUS" || stats.plano === "PREMIUM";
  const ehPremium = stats.plano === "PREMIUM";

  const taxonomy = useMemo(() => taxonomyFromStats(stats.tipos), [stats.tipos]);
  const unlocked = useMemo(() => unlockedNiches(stats.tipos), [stats.tipos]);
  const pulse = useMemo(() => pulseWeekFromEvolucao(stats.evolucao), [stats.evolucao]);
  const radarAxes = useMemo(() => radarFromStats(stats.generos), [stats.generos]);
  const radarDemo = Object.values(stats.generos).filter((v) => v > 0).length < 3;
  const topBar = taxonomy.find((b) => b.value > 0);
  const activeNichesCount = taxonomy.filter((b) => b.value > 0).length;
  const periodSeries = PERIOD_SERIES[period];

  // Métricas reais (auditoria S1): total/afinidade/conclusão derivam da
  // resposta REAL de /api/v1/user/stats; sem dado → "—", nunca inventado.
  const afinidade = affinityFromHistograma(stats.histograma);
  const conclusao = completionPct(stats.total, stats.concluidos);
  const afinidadeLabel = afinidade == null ? "—" : ptNumber(afinidade);
  const conclusaoLabel = conclusao == null ? "—" : `${conclusao}%`;

  // Evolução REAL (Premium): série mensal 12m zero-preenchida da API.
  const evolucaoReal = ehPremium && stats.evolucao ? stats.evolucao : null;
  const evolucaoData = evolucaoReal
    ? evolucaoReal.map((p) => ({ label: p.mes.substring(2), atividades: p.total }))
    : periodSeries.labels.map((label, index) => ({
        label,
        indice: periodSeries.taste[index],
        atividades: periodSeries.activity[index],
      }));
  // Delta real do mês (último vs. anterior) p/ o box de curiosidade.
  const ultimos = evolucaoReal ? evolucaoReal.slice(-2) : [];
  const deltaReal =
    ultimos.length === 2 && ultimos[0].total > 0
      ? `${ultimos[1].total - ultimos[0].total >= 0 ? "+" : ""}${ultimos[1].total - ultimos[0].total}`
      : evolucaoReal
        ? `${ultimos[ultimos.length - 1]?.total ?? 0}`
        : null;

  const strongest = radarAxes.reduce<RadarAxis | null>(
    (best, axis) => (best == null || axis.value > best.value ? axis : best),
    null,
  );
  const biggestJump = radarAxes.reduce<RadarAxis | null>(
    (best, axis) =>
      best == null || axis.value - axis.previous > best.value - best.previous ? axis : best,
    null,
  );

  // Feed de atividades REAL: interações do usuário na janela selecionada.
  const feedDays = Number(feedPeriod);
  const agora = Date.now();
  const atividadesReais = useMemo(() => {
    if (!interacoes) return null;
    return interacoes.filter((i) => idadeEmDias(i.atualizadoEm, agora) <= feedDays).slice(0, 12);
  }, [interacoes, feedDays, agora]);
  const usandoDemoFeed = interacoes === null;

  // F17: sem descobertas reais, o fallback demo é rotulado na seção.
  const usandoDemoDescobertas =
    (realDiscoveries ?? []).filter((d) => d.toMedia?.titulo).length === 0;
  const discoveryCards = useMemo<DiscoveryCardLike[]>(() => {
    const reais = (realDiscoveries ?? [])
      .filter((d) => d.toMedia?.titulo)
      .slice(0, 3)
      .map<DiscoveryCardLike>((d) => ({
        title: d.toMedia.titulo,
        href: `/media/${d.toMedia.id}`,
        meta:
          d.fromMedia?.titulo != null
            ? t("discFrom", { title: d.fromMedia.titulo })
            : t("discDesc"),
        score: d.toMedia.score,
        // MEDIA Score™ da API é 0-100 para TODOS os tipos (o /10 do dataset
        // demo é exclusivo do protótipo).
        scoreMax: 100,
        niche: nicheFromApiTipo(d.toMediaType),
      }));
    return reais.length > 0
      ? reais
      : DEMO_DISCOVERIES.map<DiscoveryCardLike>((d) => ({
          title: d.title,
          href: "/catalog",
          meta: t(d.metaKey as never),
          score: d.score,
          scoreMax: d.scoreMax,
          niche: d.niche,
        }));
  }, [realDiscoveries]);
  const visibleDiscoveries = onlyFavorites ? discoveryCards.slice(0, 1) : discoveryCards;

  const trendData = TREND_SERIES[trendPeriod];
  const activeNiches = selectedNiches.length > 0 ? selectedNiches : [];
  const nicheColors: Record<string, string> = Object.fromEntries(
    NICHE_ORDER.map((n) => [n, CATEGORY_TOKENS[n as MediaType].color]),
  );
  const displayTrendData = trendData.map((point, index) => {
    const row: Record<string, string | number> = { ...point };
    if (activeNiches.length === 0) return row;
    for (const niche of activeNiches) {
      const adjust = NICHE_ADJUSTMENTS[niche];
      row[`nota_${niche}`] = Math.min(
        10,
        Math.max(0, point.nota + adjust.user + (index % 2 ? 0.05 : 0)),
      );
      row[`comunidade_${niche}`] = Math.min(10, Math.max(0, point.comunidade + adjust.community));
    }
    return row;
  });
  const selectedNicheLabel =
    activeNiches.length === 1
      ? tc(nicheLabelKey(activeNiches[0]) as never)
      : activeNiches.length > 1
        ? t("trendNichesCount", { n: activeNiches.length })
        : t("overviewAll");

  const lastRow = displayTrendData[displayTrendData.length - 1] as Record<string, number>;
  const trendEnd = Number(lastRow?.[`nota_${activeNiches[0]}`] ?? lastRow?.nota ?? 0);
  const communityEnd = Number(
    lastRow?.[`comunidade_${activeNiches[0]}`] ?? lastRow?.comunidade ?? 0,
  );
  const gap = trendEnd - communityEnd;
  const pct = communityEnd
    ? formatarScoreLocale(Math.abs((gap / communityEnd) * 100), locale)
    : "0,0";
  const trendSummary =
    gap === 0
      ? t("trendNeutral")
      : gap > 0
        ? t("trendPhraseUp", { genre: selectedNicheLabel, pct })
        : t("trendPhraseDown", { genre: selectedNicheLabel, pct });
  const visibleAchievements = ACHIEVEMENT_CATALOG.filter((a) => {
    if (achievementFilter === "all") return true;
    if (achievementFilter === "unlocked") return unlocked.includes(a.niche);
    return a.niche === achievementFilter;
  });

  const mostrarAviso = (mensagem: string) => {
    setNotice(mensagem);
    window.setTimeout(() => setNotice((atual) => (atual === mensagem ? "" : mensagem)), 2800);
  };

  const shareReport = async (platform?: "x" | "linkedin" | "whatsapp" | "facebook") => {
    const url = window.location.href;
    const text = `${t("shareIntro")} · ${trendSummary}`;
    if (!platform && typeof navigator.share === "function") {
      await navigator.share({ title: "MEDIA Rate", text, url }).catch(() => undefined);
      return;
    }
    if (!platform) {
      await navigator.clipboard?.writeText(`${text} ${url}`);
      mostrarAviso(t("profileShareCopied"));
      return;
    }
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    const links = {
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    };
    window.open(links[platform], "_blank", "noopener,noreferrer,width=680,height=560");
  };

  const buildReportSvg = () => {
    const radarLine = radarAxes.map((axis) => `${axis.label} ${axis.value}%`).join("   ·   ");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill={DASH.deeper}/><text x="72" y="78" fill={DASH.indigoLight} font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="700">MEDIA RATE</text><text x="72" y="138" fill="#ffffff" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="700">${t("overviewTitleA")} ${t("overviewTitleB")}</text><text x="72" y="178" fill={DASH.muted} font-family="Inter, system-ui, sans-serif" font-size="18">${t("overviewDesc")}</text><rect x="72" y="232" width="316" height="142" rx="18" fill={DASH.surface3}/><rect x="420" y="232" width="316" height="142" rx="18" fill={DASH.surface3}/><rect x="768" y="232" width="316" height="142" rx="18" fill={DASH.surface3}/><text x="96" y="272" fill={DASH.muted} font-family="Inter, system-ui, sans-serif" font-size="14">${t("overviewRated")}</text><text x="96" y="330" fill="#ffffff" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="700">${stats.total}</text><text x="444" y="272" fill={DASH.muted} font-family="Inter, system-ui, sans-serif" font-size="14">${t("overviewAffinity")}</text><text x="444" y="330" fill="#ffffff" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="700">${afinidadeLabel}</text><text x="792" y="272" fill={DASH.muted} font-family="Inter, system-ui, sans-serif" font-size="14">${t("overviewCompletion")}</text><text x="792" y="330" fill="#ffffff" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="700">${conclusaoLabel}</text><rect x="72" y="424" width="1012" height="240" rx="18" fill={DASH.surface3}/><text x="100" y="470" fill="#ffffff" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="700">${t("radarTitle")}</text><text x="100" y="520" fill={DASH.indigoLight} font-family="Inter, system-ui, sans-serif" font-size="17">${radarLine}</text><text x="100" y="570" fill={DASH.muted} font-family="Inter, system-ui, sans-serif" font-size="16">${trendSummary}</text><text x="100" y="620" fill={DASH.muted} font-family="Inter, system-ui, sans-serif" font-size="16">MEDIA Rate</text></svg>`;
  };

  const exportImage = () => {
    const url = URL.createObjectURL(new Blob([buildReportSvg()], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "media-rate-relatorio-evolucao.svg";
    link.click();
    URL.revokeObjectURL(url);
    mostrarAviso(t("profileExportedImage"));
  };

  const exportPdf = () => {
    const win = window.open("", "_blank", "width=980,height=760");
    if (!win) {
      mostrarAviso(t("profilePopupBlocked"));
      return;
    }
    win.document.write(
      `<html><head><title>MEDIA Rate</title><style>body{font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#0b0b12;color:#fff;padding:48px}h1{font-size:36px}p{color:#aaa}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:32px 0}.card{background:#171725;border-radius:16px;padding:24px}.value{font-size:34px;font-weight:700;margin-top:18px}</style></head><body><div style="color:#a69cff">MEDIA RATE</div><h1>${t("overviewTitleA")} ${t("overviewTitleB")}</h1><p>${t("overviewDesc")}</p><div class="grid"><div class="card">${t("overviewRated")}<div class="value">${stats.total}</div></div><div class="card">${t("overviewAffinity")}<div class="value">${afinidadeLabel}</div></div><div class="card">${t("overviewCompletion")}<div class="value">${conclusaoLabel}</div></div></div><div class="card"><h2>${t("radarTitle")}</h2><p style="color:#a69cff">${radarAxes.map((a) => `${a.label} ${a.value}%`).join(" · ")}</p><p>${trendSummary}</p><script>window.onload=()=>window.print()</script></body></html>`,
    );
    win.document.close();
  };

  // Cartões de métrica: valor REAL em primeiro lugar; spark/trend REAIS
  // quando a API fornece série (Premium) — sem série, o card fica 100% real
  // (sem trend/spark demonstrativos nem selo: o valor nunca é demo — F17).
  const evolucaoTotais = evolucaoReal ? evolucaoReal.map((p) => p.total) : null;
  const metricCards = [
    {
      label: t("overviewRated"),
      value: String(stats.total),
      helper: t("metricRatedHelper"),
      trend: evolucaoTotais
        ? deltaReal && !deltaReal.startsWith("-")
          ? `+${deltaReal.replace("+", "")}`
          : deltaReal
        : null,
      icon: BarChart3,
      color: DASH.indigo,
      spark: evolucaoTotais,
      demo: false,
    },
    {
      label: t("overviewAffinity"),
      value: afinidadeLabel,
      helper: t("metricAffinityHelper"),
      trend: null as string | null,
      icon: Heart,
      color: DASH.teal,
      spark: stats.histograma.map((h) => h.total),
      demo: false,
    },
    {
      label: t("overviewCompletion"),
      value: conclusaoLabel,
      helper: t("metricCompletionHelper"),
      trend: null as string | null,
      icon: Check,
      color: DASH.amber,
      spark: null as number[] | null,
      demo: false,
    },
    {
      label: t("overviewDiscoveries"),
      value:
        realDiscoveries === null
          ? "—"
          : String(realDiscoveries.filter((d) => d.toMedia?.titulo).length),
      helper: t("metricDiscoveriesHelper"),
      trend: null as string | null,
      icon: Compass,
      color: DASH.coral,
      spark: null as number[] | null,
      demo: false,
    },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-overview">
      {notice && (
        <div
          className="mb-5 flex items-center justify-between rounded-xl border border-dash-indigo/20 bg-dash-indigo/10 px-4 py-3 text-[12px] text-[#c9c4ff]"
          role="status"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={14} />
            {notice}
          </span>
          <button type="button" onClick={() => setNotice("")} aria-label={t("noticeDismiss")}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hero + seletor de período */}
      <section
        data-testid="overview-hero"
        className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end"
      >
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-dash-violet">
            <span className="h-1.5 w-1.5 rounded-full bg-dash-teal shadow-[0_0_12px_#62d7c5]" />
            {t("overviewKicker")}
          </div>
          <h2 className="max-w-2xl text-[30px] font-bold leading-[1.05] tracking-[-0.055em] text-white sm:text-[42px]">
            {t("overviewTitleA")}{" "}
            <span className="text-dash-indigo-light">{t("overviewTitleB")}</span>
          </h2>
          <p className="mt-3 max-w-xl text-[13px] leading-6 text-fg-muted">{t("overviewDesc")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          <CalendarDays size={15} className="ml-2 text-fg-muted" />
          {OVERVIEW_PERIODS.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${period === option ? "bg-dash-indigo text-dash-deep shadow-[0_4px_18px_rgba(139,124,255,.22)]" : "text-fg-muted hover:text-white"}`}
            >
              {t(index === 0 ? "period30" : index === 1 ? "period90" : "period12")}
            </button>
          ))}
        </div>
      </section>

      {/* Métricas (4 mini-cards): valor real; spark/trend reais quando há série */}
      <section data-testid="overview-metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((m) => {
          const Icon = m.icon;
          const trend = m.trend ?? null;
          const positive = trend != null && !trend.startsWith("−") && !trend.startsWith("-");
          return (
            <div
              key={m.label}
              className="group relative overflow-hidden rounded-lg border border-white/[0.07] bg-dash-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.14]"
            >
              <div
                className="absolute -right-8 -top-10 h-28 w-28 rounded-full blur-3xl"
                style={{ background: m.color, opacity: 0.12 }}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-fg-muted">
                    <span
                      className="grid h-6 w-6 place-items-center rounded-lg"
                      style={{ background: `${m.color}18`, color: m.color }}
                    >
                      <Icon size={13} />
                    </span>
                    {m.label}
                    {m.demo && <DemoBadge label={t("demoBadge")} />}
                  </div>
                  <p className="text-[28px] font-bold tracking-[-0.05em] text-white">{m.value}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-fg-muted">
                    {trend != null && (
                      <span className={positive ? "text-dash-teal" : "text-dash-coral-alt"}>
                        {positive ? (
                          <ArrowUpRight size={13} className="inline" />
                        ) : (
                          <ArrowDownRight size={13} className="inline" />
                        )}
                        {trend}
                      </span>
                    )}
                    {m.helper}
                  </div>
                </div>
                {m.spark && m.spark.length > 1 && (
                  <MiniSparkline values={m.spark} color={m.color} ariaLabel={m.label} />
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Consistência: streak + histograma de notas (reais, todos os planos — T396) */}
      <section data-testid="overview-consistency" className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6">
          <SectionHead
            icon={
              <span
                className="grid h-7 w-7 place-items-center rounded-lg"
                style={{
                  background: `${CATEGORY_TOKENS.game.color}26`,
                  color: CATEGORY_TOKENS.game.color,
                }}
              >
                <Zap size={14} />
              </span>
            }
            title={t("streak")}
            desc={t("streakHint")}
          />
          <p
            className="text-[42px] font-bold leading-none tracking-[-0.05em]"
            style={{ color: CATEGORY_TOKENS.game.color }}
          >
            {stats.streak}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6">
          <SectionHead
            icon={
              <span
                className="grid h-7 w-7 place-items-center rounded-lg"
                style={{
                  background: `${CATEGORY_TOKENS.series.color}26`,
                  color: CATEGORY_TOKENS.series.color,
                }}
              >
                <BarChart3 size={14} />
              </span>
            }
            title={t("scoreHistogram")}
            desc={t("metricAffinityHelper")}
          />
          <HistogramBars histograma={stats.histograma} />
        </div>
      </section>

      {/* Radar de gosto (Plus+) + evolução (Premium) — T402 coerente */}
      <section className="grid gap-5 xl:grid-cols-[1.05fr_1.45fr]">
        {ehPlus ? (
          <div
            data-testid="overview-radar"
            className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6"
          >
            <SectionHead
              icon={
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-dash-indigo/15 text-dash-indigo-light">
                  <Target size={14} />
                </span>
              }
              title={t("radarTitle")}
              desc={t("radarDesc")}
              badge={radarDemo ? <DemoBadge label={t("demoBadge")} /> : undefined}
            />
            <RadarGraphic axes={radarAxes} />
            {!radarDemo && (
              <p className="mt-2 text-[10px] text-fg-muted">{t("radarPreviousNote")}</p>
            )}
            <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
              <div>
                <p className="text-[11px] text-fg-muted">{t("radarStrongest")}</p>
                <p className="mt-1 text-[15px] font-bold text-white">
                  {strongest ? strongest.label : "—"}{" "}
                  {strongest && <span className="ml-1 text-dash-violet">{strongest.value}%</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-fg-muted">{t("radarBiggestJump")}</p>
                <p className="mt-1 flex items-center justify-end gap-1 text-[15px] font-bold text-dash-teal">
                  <TrendingUp size={14} />
                  {biggestJump
                    ? `${biggestJump.label} +${biggestJump.value - biggestJump.previous}%`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <PreviewCard
            titulo={t("radarTitle")}
            selo="Plus"
            hint={t("upgradeHint")}
            cta={t("upgrade")}
            onCta={() => router.push("/pricing")}
          />
        )}

        {evolucaoReal ? (
          <div
            data-testid="overview-evolution"
            className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6"
          >
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <SectionHead
                icon={
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-dash-teal/15 text-dash-teal">
                    <Activity size={14} />
                  </span>
                }
                title={t("evoTitle")}
                desc={t("evoDesc")}
              />
              <div className="flex items-center gap-3 text-[10px] text-fg-muted">
                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-full bg-dash-teal" /> {t("evoLegendActivity")}
                </span>
              </div>
            </div>
            <div className="h-[310px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucaoData} margin={{ top: 14, right: 8, left: -23, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "rgba(255,255,255,.25)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: DASH.surface4,
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 12,
                      fontSize: 11,
                      color: "#fff",
                    }}
                    labelStyle={{ color: "rgba(255,255,255,.5)", marginBottom: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="atividades"
                    stroke={DASH.teal}
                    strokeWidth={3}
                    dot={{ r: 3, fill: DASH.teal, strokeWidth: 0 }}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-dash-teal/[0.07] px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] text-white/55">
                <Zap size={14} className="text-dash-teal" />
                {t("evoCuriosity")}
              </div>
              <span className="text-[13px] font-bold text-dash-teal">{deltaReal ?? "—"}</span>
            </div>
          </div>
        ) : (
          <PreviewCard
            titulo={t("evoTitle")}
            selo="Premium"
            hint={t("premiumHint")}
            cta={t("upgrade")}
            onCta={() => router.push("/pricing")}
          />
        )}
      </section>

      {/* Taxonomia (Plus+) + pulso (Premium; distribuição derivada rotulada) */}
      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        {ehPlus ? (
          <div
            data-testid="overview-taxonomy"
            className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6"
          >
            <SectionHead
              icon={
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-dash-amber/15 text-dash-amber">
                  <Library size={14} />
                </span>
              }
              title={t("taxonomyTitle")}
              desc={t("taxonomyDesc")}
            />
            <div className="space-y-5">
              {taxonomy.map((item) => {
                const Icon = nicheIcon(item.niche);
                return (
                  <div
                    key={item.niche}
                    className="group transition duration-300 hover:translate-x-1"
                  >
                    <div className="mb-2 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-2 font-semibold text-white/65">
                        <Icon size={14} style={{ color: item.color }} />
                        {tc(nicheLabelKey(item.niche) as never)}
                      </span>
                      <span className="font-bold text-white">{item.pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-[filter] duration-500 group-hover:brightness-125"
                        style={{ width: `${item.pct}%`, background: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-5">
              <div>
                <p className="text-[10px] text-fg-muted">{t("taxonomyMostConsumed")}</p>
                <p className="mt-1 text-[12px] font-bold text-white">
                  {topBar ? tc(nicheLabelKey(topBar.niche) as never) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-fg-muted">{t("taxonomyActiveNiches")}</p>
                <p className="mt-1 text-[12px] font-bold text-white">{activeNichesCount} / 6</p>
              </div>
              <div>
                <p className="text-[10px] text-fg-muted">{t("taxonomyTrending")}</p>
                <p className="mt-1 text-[12px] font-bold text-white">
                  {topBar ? `${topBar.pct}%` : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <PreviewCard
            titulo={t("taxonomyTitle")}
            selo="Plus"
            hint={t("upgradeHint")}
            cta={t("upgrade")}
            onCta={() => router.push("/pricing")}
          />
        )}

        {ehPremium ? (
          <div
            data-testid="overview-pulse"
            className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6"
          >
            <SectionHead
              icon={
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-dash-coral/15 text-dash-coral-light">
                  <Flame size={14} />
                </span>
              }
              title={t("pulseTitle")}
              desc={t("pulseDesc")}
              badge={<DemoBadge label={t("demoBadge")} />}
            />
            <div className="h-[206px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pulse}
                  margin={{ top: 5, right: 0, left: -28, bottom: 0 }}
                  barGap={2}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,.2)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,.04)" }}
                    contentStyle={{
                      background: DASH.surface4,
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 12,
                      fontSize: 11,
                      color: "#fff",
                    }}
                  />
                  {/* Cores canônicas dos ícones de mídia (design-tokens), não
                      a paleta do protótipo. */}
                  <Bar dataKey="movie" stackId="a" fill={CATEGORY_TOKENS.movie.color} />
                  <Bar dataKey="series" stackId="a" fill={CATEGORY_TOKENS.series.color} />
                  <Bar dataKey="game" stackId="a" fill={CATEGORY_TOKENS.game.color} />
                  <Bar dataKey="book" stackId="a" fill={CATEGORY_TOKENS.book.color} />
                  <Bar dataKey="comic" stackId="a" fill={CATEGORY_TOKENS.comic.color} />
                  <Bar
                    dataKey="manga"
                    stackId="a"
                    fill={CATEGORY_TOKENS.manga.color}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <PreviewCard
            titulo={t("pulseTitle")}
            selo="Premium"
            hint={t("premiumHint")}
            cta={t("upgrade")}
            onCta={() => router.push("/pricing")}
          />
        )}
      </section>

      {/* Conquistas + feed de atividades (REAL: interações do usuário) */}
      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div
          data-testid="overview-achievements"
          className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6"
        >
          <div className="mb-5 flex items-start justify-between">
            <SectionHead
              icon={
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-dash-amber/15 text-dash-amber">
                  <Trophy size={14} />
                </span>
              }
              title={t("achvTitle")}
              desc={t("achvDesc")}
            />
            <span className="rounded-full border border-dash-amber/20 bg-dash-amber/10 px-2 py-1 text-[9px] font-bold text-dash-amber">
              {unlocked.length} / 6
            </span>
          </div>
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
            {[
              { v: "all", label: t("overviewAll") },
              { v: "unlocked", label: t("achvUnlocked") },
              ...NICHE_ORDER.map((n) => ({ v: n, label: tc(nicheLabelKey(n) as never) })),
            ].map((f) => (
              <button
                key={f.v}
                type="button"
                onClick={() => setAchievementFilter(f.v)}
                className={`whitespace-nowrap rounded-full border px-2 py-1.5 text-[9px] font-bold transition ${achievementFilter === f.v ? "border-dash-amber/35 bg-dash-amber/15 text-dash-amber" : "border-white/[0.08] text-fg-muted hover:text-white"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visibleAchievements.map((a) => {
              const Icon = nicheIcon(a.niche);
              const isUnlocked = unlocked.includes(a.niche);
              const token = CATEGORY_TOKENS[a.niche as keyof typeof CATEGORY_TOKENS];
              return (
                <div
                  key={a.niche}
                  className={`rounded-xl border p-3 transition duration-300 ${isUnlocked ? "border-white/[0.1] bg-white/[0.045] hover:-translate-y-0.5" : "border-white/[0.05] bg-white/[0.015] opacity-55"}`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="grid h-8 w-8 place-items-center rounded-lg"
                      style={{
                        background: `${token.color}${isUnlocked ? "22" : "0d"}`,
                        color: token.color,
                      }}
                    >
                      <Icon size={16} />
                    </span>
                    {isUnlocked && <Check size={13} className="text-dash-teal" />}
                  </div>
                  <p className="mt-2 text-[12px] font-bold text-white">{t(a.titleKey as never)}</p>
                  <p className="mt-0.5 text-[10px] text-fg-muted">{t(a.detailKey as never)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div
          data-testid="overview-feed"
          className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6"
        >
          <div className="mb-5 flex items-start justify-between">
            <SectionHead
              icon={
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-dash-teal/15 text-dash-teal">
                  <Activity size={14} />
                </span>
              }
              title={t("feedTitle")}
              desc={t("feedDesc")}
              badge={usandoDemoFeed ? <DemoBadge label={t("demoBadge")} /> : undefined}
            />
            <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-1">
              {(["7", "30", "365"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFeedPeriod(option)}
                  className={`rounded-md px-2 py-1 text-[8px] font-bold transition ${feedPeriod === option ? "bg-dash-teal/15 text-dash-teal" : "text-fg-muted hover:text-white"}`}
                >
                  {t(option === "7" ? "feed7" : option === "30" ? "feed30" : "feedYear")}
                </button>
              ))}
            </div>
          </div>

          {usandoDemoFeed ? (
            <div className="space-y-1">
              {ACTIVITY_FEED.filter((item) => item.days <= feedDays).map((activity, index) => {
                const Icon = nicheIcon(activity.niche);
                const token = CATEGORY_TOKENS[activity.niche as keyof typeof CATEGORY_TOKENS];
                return (
                  <div
                    key={activity.titleKey}
                    className="relative flex gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.03]"
                  >
                    {index < ACTIVITY_FEED.length - 1 && (
                      <span className="absolute bottom-[-4px] left-[18px] top-[34px] w-px bg-white/[0.08]" />
                    )}
                    <span
                      className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                      style={{ background: `${token.color}18`, color: token.color }}
                    >
                      <Icon size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold text-white">
                          {t(activity.titleKey as never)}
                        </p>
                        <span className="shrink-0 text-[9px] text-fg-muted">
                          {resolveTimeKey(t as never, activity.timeKey)}
                        </span>
                      </div>
                      <p className="mt-1 text-[9px] text-fg-muted">
                        {t(activity.detailKey as never)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : atividadesReais != null && atividadesReais.length === 0 ? (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
              <p className="text-[11px] text-fg-muted">{t("feedEmpty")}</p>
              <Link
                href="/catalog"
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-dash-teal/15 px-3 py-1.5 text-[10px] font-bold text-dash-teal transition hover:bg-dash-teal/25"
              >
                {t("feedEmptyCta")} <ChevronRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {(atividadesReais ?? []).map((item) => {
                const niche = nicheFromApiTipo(item.midia.tipo);
                const Icon = nicheIcon(niche);
                const token = CATEGORY_TOKENS[niche as keyof typeof CATEGORY_TOKENS];
                const meta = STATUS_META[item.status];
                return (
                  <Link
                    key={item.id}
                    href={`/media/${item.midiaId}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.03]"
                  >
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                      style={{ background: `${token.color}18`, color: token.color }}
                    >
                      <Icon size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] font-bold text-white">
                          {item.midia.titulo}
                        </p>
                        <span className="shrink-0 text-[9px] text-fg-muted">
                          {resolveTimeKey(t as never, tempoRelativoKey(item.atualizadoEm))}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${meta.className}`}
                        >
                          {t(meta.labelKey as never)}
                        </span>
                        {item.midia.score != null && (
                          <span className="text-[9px] text-fg-muted">
                            {formatScoreValue(item.midia.score, 100)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Tendência das notas vs comunidade + comparativo (demo rotulado) */}
      <section className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div
          data-testid="overview-trend"
          className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6"
        >
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <SectionHead
              icon={
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-dash-coral/15 text-dash-coral-light">
                  <TrendingUp size={14} />
                </span>
              }
              title={t("trendTitle")}
              desc={t("trendDesc")}
              badge={<DemoBadge label={t("demoBadge")} />}
            />
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-dash-surface-2 p-1">
                {(["30 dias", "90 dias", "12 meses"] as TrendPeriod[]).map((p, index) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTrendPeriod(p)}
                    className={`rounded-md px-2 py-1 text-[8px] font-bold ${trendPeriod === p ? "bg-dash-indigo/20 text-dash-violet-light" : "text-fg-muted"}`}
                  >
                    {t(index === 0 ? "period30" : index === 1 ? "period90" : "period12")}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-dash-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => setChartMode("lines")}
                  className={`rounded-md px-2 py-1 text-[8px] font-bold ${chartMode === "lines" ? "bg-dash-indigo/20 text-dash-violet-light" : "text-fg-muted"}`}
                >
                  {t("trendLines")}
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode("bars")}
                  className={`rounded-md px-2 py-1 text-[8px] font-bold ${chartMode === "bars" ? "bg-dash-indigo/20 text-dash-violet-light" : "text-fg-muted"}`}
                >
                  {t("trendBars")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCompareCommunity(!compareCommunity)}
                className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-bold transition ${compareCommunity ? "border-dash-blue/30 bg-dash-blue/10 text-dash-blue" : "border-white/[0.08] text-fg-muted"}`}
              >
                {compareCommunity ? t("trendComparing") : t("trendCompare")}
              </button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-1 rounded-lg border border-white/[0.08] bg-dash-surface-2 p-1">
            {NICHE_ORDER.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  setSelectedNiches((atual) =>
                    atual.includes(n) ? atual.filter((x) => x !== n) : [...atual, n],
                  )
                }
                className={`rounded-md px-1.5 py-1 text-[8px] font-bold transition ${selectedNiches.includes(n) ? "bg-dash-indigo/20 text-dash-violet-light" : "text-fg-muted hover:text-white"}`}
              >
                {tc(nicheLabelKey(n) as never)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedNiches([])}
              className={`rounded-md px-1.5 py-1 text-[8px] font-bold transition ${selectedNiches.length === 0 ? "bg-white/[0.08] text-white" : "text-fg-muted hover:text-white"}`}
            >
              {t("overviewAll")}
            </button>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "lines" ? (
                <LineChart
                  data={displayTrendData}
                  margin={{ top: 14, right: 8, left: -23, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    domain={[6, 10]}
                    tick={{ fill: "rgba(255,255,255,.25)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: DASH.surface4,
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 12,
                      fontSize: 11,
                      color: "#fff",
                    }}
                  />
                  {activeNiches.length === 0 ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="nota"
                        stroke={DASH.coral}
                        strokeWidth={3}
                        dot={{ r: 3, fill: DASH.coral, strokeWidth: 0 }}
                      />
                      {compareCommunity && (
                        <Line
                          type="monotone"
                          dataKey="comunidade"
                          stroke={DASH.blue}
                          strokeWidth={2.5}
                          dot={false}
                          strokeDasharray="5 5"
                        />
                      )}
                    </>
                  ) : (
                    activeNiches.map((niche) => {
                      const color = nicheColors[niche];
                      return (
                        <Line
                          key={niche}
                          type="monotone"
                          dataKey={`nota_${niche}`}
                          name={`${tc(nicheLabelKey(niche) as never)} · ${t("trendYou")}`}
                          stroke={color}
                          strokeWidth={3}
                          dot={{ r: 3, fill: color, strokeWidth: 0 }}
                        />
                      );
                    })
                  )}
                </LineChart>
              ) : (
                <BarChart
                  data={displayTrendData}
                  margin={{ top: 14, right: 8, left: -23, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    domain={[6, 10]}
                    tick={{ fill: "rgba(255,255,255,.25)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,.04)" }}
                    contentStyle={{
                      background: DASH.surface4,
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 12,
                      fontSize: 11,
                      color: "#fff",
                    }}
                  />
                  {activeNiches.length === 0 ? (
                    <>
                      <Bar dataKey="nota" fill={DASH.coral} radius={[4, 4, 0, 0]} />
                      {compareCommunity && (
                        <Bar dataKey="comunidade" fill={DASH.blue} radius={[4, 4, 0, 0]} />
                      )}
                    </>
                  ) : (
                    activeNiches.map((niche) => {
                      const color = nicheColors[niche];
                      return (
                        <Bar
                          key={niche}
                          dataKey={`nota_${niche}`}
                          fill={color}
                          radius={[4, 4, 0, 0]}
                        />
                      );
                    })
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-[12px] leading-5 text-white/55">{trendSummary}</p>
        </div>

        <aside
          data-testid="overview-trend-aside"
          className="rounded-lg border border-dash-blue/15 bg-gradient-to-br from-[#111c2b] to-dash-surface p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-muted">
              {t("trendSelected")}
            </p>
            <DemoBadge label={t("demoBadge")} />
          </div>
          <p className="mt-2 text-[15px] font-bold text-white">{selectedNicheLabel}</p>
          <p className="mt-1 text-[10px] text-fg-muted">
            {trendPeriod === "30 dias"
              ? t("period30")
              : trendPeriod === "90 dias"
                ? t("period90")
                : t("period12")}
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-[10px] text-fg-muted">{t("trendAvgYou")}</p>
              <p className="mt-1 text-2xl font-bold text-dash-coral-light">
                {ptNumber(trendEnd)}
                <span className="ml-1 text-[11px] text-fg-muted">/10</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-fg-muted">{t("trendAvgCommunity")}</p>
              <p className="mt-1 text-2xl font-bold text-dash-blue">
                {ptNumber(communityEnd)}
                <span className="ml-1 text-[11px] text-fg-muted">/10</span>
              </p>
            </div>
            <div
              className={`rounded-xl px-3 py-2 ${gap >= 0 ? "bg-dash-teal/10" : "bg-dash-coral/10"}`}
            >
              <p className="text-[10px] text-white/45">{t("trendDiff")}</p>
              <p
                className={`mt-1 text-xl font-bold ${gap >= 0 ? "text-dash-teal" : "text-dash-coral-light"}`}
              >
                {gap >= 0 ? "+" : ""}
                {communityEnd ? formatarScoreLocale((gap / communityEnd) * 100, locale) : "0,0"}%
              </p>
            </div>
          </div>
          <p className="mt-5 text-[10px] leading-4 text-fg-muted">{trendSummary}</p>
        </aside>
      </section>

      {/* Descobertas com contexto (dados reais T201 com fallback demo) */}
      <section
        data-testid="overview-discoveries"
        className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6"
      >
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-dash-violet/15 text-dash-indigo-light">
                <Sparkles size={14} />
              </span>
              <h3 className="text-[14px] font-bold text-white">{t("discTitle")}</h3>
              <span className="rounded-full bg-dash-violet/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-dash-indigo-light">
                {t("discBeta")}
              </span>
              {usandoDemoDescobertas && <DemoBadge label={t("demoBadge")} />}
            </div>
            <p className="text-[11px] leading-5 text-fg-muted">{t("discDesc")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyFavorites((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-semibold transition ${onlyFavorites ? "border-dash-coral/40 bg-dash-coral/10 text-dash-coral-light" : "border-white/[0.08] text-fg-muted hover:text-white"}`}
            >
              <Heart size={13} fill={onlyFavorites ? "currentColor" : "none"} />
              {onlyFavorites ? t("discTabFav") : t("discTabAll")}
            </button>
            <Link
              href="/dashboard/discoveries"
              className="flex items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-semibold text-fg-muted transition hover:bg-white/[0.06] hover:text-white"
            >
              {t("discViewAll")} <ChevronRight size={13} />
            </Link>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {visibleDiscoveries.map((item) => {
            const Icon = nicheIcon(item.niche);
            const token = CATEGORY_TOKENS[item.niche as keyof typeof CATEGORY_TOKENS];
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/[0.15] hover:bg-white/[0.05]"
              >
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                  style={{ background: `${token.color}18`, color: token.color }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[12px] font-bold text-white">{item.title}</p>
                    {item.score != null && <ScoreBadge score={item.score} max={item.scoreMax} />}
                  </div>
                  <p className="text-[10px] leading-4 text-white/50">{item.meta}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-dash-indigo-light opacity-0 transition group-hover:opacity-100">
                    {t("discExplore")} <ArrowUpRight size={12} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Leitura do perfil (export/share com métricas reais) */}
      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div
          data-testid="overview-profile"
          className="relative overflow-hidden rounded-lg border border-dash-indigo/20 bg-gradient-to-br from-[#18152d] via-[#12121f] to-dash-surface p-5 sm:p-6"
        >
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-dash-indigo/15 blur-3xl" />
          <div className="relative">
            <div className="mb-8 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
                {t("profileTitle")}
              </span>
              <span className="rounded-full border border-dash-teal/25 bg-dash-teal/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-dash-teal">
                {t("profileUpdated")}
              </span>
            </div>
            <p className="max-w-sm text-[24px] font-bold leading-[1.12] tracking-[-0.05em] text-white">
              {t("profileHeadlineA")}{" "}
              <span className="text-dash-indigo-light">{t("profileHeadlineB")}</span>
            </p>
            <p className="mt-3 max-w-sm text-[11px] leading-5 text-fg-muted">{t("profileDesc")}</p>
            <div className="mb-2 mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
                <p className="text-[10px] text-fg-muted">{t("profileCompat")}</p>
                <p className="mt-1 text-[21px] font-bold text-white">
                  {afinidade == null ? "—" : `${Math.round(afinidade * 10)}%`}
                </p>
                <p className="mt-1 text-[10px] text-dash-teal">{t("profileCompatDetail")}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
                <p className="text-[10px] text-fg-muted">{t("profileNextJump")}</p>
                <p className="mt-1 text-[21px] font-bold text-white">
                  {strongest ? strongest.label : "—"}
                </p>
                <p className="mt-1 text-[10px] text-dash-amber">{t("profileNextDetail")}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={exportPdf}
                className="flex items-center justify-center gap-2 rounded-xl bg-dash-indigo px-3 py-3 text-[11px] font-bold text-dash-deep transition hover:bg-dash-indigo-light active:scale-[.98]"
              >
                {t("profileExportPdf")} <ArrowUpRight size={14} />
              </button>
              <button
                type="button"
                onClick={exportImage}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-3 text-[11px] font-bold text-white transition hover:bg-white/[0.09] active:scale-[.98]"
              >
                {t("profileExportImage")} <BarChart3 size={14} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-fg-muted">{t("profileShareLabel")}</span>
              {/* T460 (Thinker): sem rota pública de relatório → sem "gerar link
                  público" (link morto). Compartilhamento usa a URL atual. */}
              <button
                type="button"
                onClick={() => void shareReport()}
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-white/65 hover:bg-white/[0.09]"
              >
                {t("profileWebShare")}
              </button>
              <button
                type="button"
                onClick={() => void shareReport("whatsapp")}
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-white/65 hover:bg-white/[0.09]"
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => void shareReport("x")}
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-white/65 hover:bg-white/[0.09]"
              >
                X
              </button>
              <button
                type="button"
                onClick={() => void shareReport("linkedin")}
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-white/65 hover:bg-white/[0.09]"
              >
                LinkedIn
              </button>
            </div>
          </div>
        </div>

        {/* Resumo numérico do perfil (real): totais + afinidade + conclusão */}
        <div
          data-testid="overview-profile-numbers"
          className="rounded-lg border border-white/[0.07] bg-dash-surface p-5 sm:p-6"
        >
          <SectionHead
            icon={
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-dash-teal/15 text-dash-teal">
                <BarChart3 size={14} />
              </span>
            }
            title={t("profileNumbersTitle")}
            desc={t("recentDesc")}
          />
          <div className="divide-y divide-white/[0.06]">
            {[
              { label: t("overviewRated"), value: String(stats.total) },
              { label: t("overviewAffinity"), value: `${afinidadeLabel}/10` },
              { label: t("overviewCompletion"), value: conclusaoLabel },
              { label: t("streak"), value: String(stats.streak) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3 first:pt-1">
                <p className="text-[11px] text-white/45">{row.label}</p>
                <p className="text-[14px] font-bold text-white">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rodapé da dashboard */}
      <footer
        data-testid="dashboard-footer"
        className="flex flex-col items-center justify-between gap-3 py-8 text-[10px] text-fg-muted sm:flex-row"
      >
        <span>{t("footerRadar")}</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-dash-teal" /> {t("footerPrivacy")}
        </span>
      </footer>
    </div>
  );
}

interface DiscoveryCardLike {
  title: string;
  href: string;
  meta: string;
  score: number | null;
  scoreMax: number;
  niche: OverviewNiche;
}
