import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";

/**
 * Dados da visão geral do dashboard (T460) — porte do protótipo
 * `design-system/media-rate-dashboard` para o App Router.
 *
 * - Taxonomia/pulso/conquistas derivam do `UserStats` REAL (`/api/v1/user/stats`).
 * - Séries de tendência/comparativo e sinais recentes são o dataset estático
 *   de demonstração do protótipo (sem endpoint dedicado na API); ficam
 *   isolados aqui para troca futura sem tocar nos componentes.
 */

export type OverviewNiche = "movie" | "series" | "game" | "book" | "comic" | "manga";

export const NICHE_ORDER: OverviewNiche[] = ["movie", "series", "game", "book", "comic", "manga"];

/** Enum da API (Prisma) → nicho da UI. */
const API_TIPO_TO_NICHE: Record<string, OverviewNiche> = {
  FILME: "movie",
  SERIE: "series",
  GAME: "game",
  LIVRO: "book",
  COMIC: "comic",
  MANGA: "manga",
};

/** Tipo da API (case-insensitive) → nicho da UI; desconhecido → movie. */
export function nicheFromApiTipo(tipo: string): OverviewNiche {
  return API_TIPO_TO_NICHE[tipo.toUpperCase()] ?? "movie";
}

export interface TaxonomyBar {
  niche: OverviewNiche;
  labelKey: string;
  color: string;
  value: number;
  /** Percentual normalizado (0-100) sobre o total de sinais por tipo. */
  pct: number;
}

export function taxonomyFromStats(tipos: Record<string, number>): TaxonomyBar[] {
  const porNicho = new Map<OverviewNiche, number>();
  for (const [tipo, total] of Object.entries(tipos)) {
    const nicho = API_TIPO_TO_NICHE[tipo];
    if (!nicho || total <= 0) continue;
    porNicho.set(nicho, (porNicho.get(nicho) ?? 0) + total);
  }
  const soma = [...porNicho.values()].reduce((a, b) => a + b, 0);
  return NICHE_ORDER.map((niche) => {
    const token = CATEGORY_TOKENS[niche as MediaType];
    const value = porNicho.get(niche) ?? 0;
    return {
      niche,
      labelKey: token.labelKey,
      color: token.color,
      value,
      pct: soma > 0 ? Math.round((value / soma) * 100) : 0,
    };
  }).sort((a, b) => b.value - a.value);
}

/** Nichos com ao menos 1 sinal — conquistas desbloqueadas. */
export function unlockedNiches(tipos: Record<string, number>): OverviewNiche[] {
  return NICHE_ORDER.filter((niche) => {
    const apiTipo = Object.entries(API_TIPO_TO_NICHE).find(([, n]) => n === niche)?.[0];
    return apiTipo !== undefined && (tipos[apiTipo] ?? 0) > 0;
  });
}

export interface PulseDay {
  day: string;
  movie: number;
  series: number;
  game: number;
  book: number;
  comic: number;
  manga: number;
}

const PULSE_FALLBACK: PulseDay[] = [
  { day: "seg", movie: 3, series: 2, book: 1, game: 3, comic: 1, manga: 1 },
  { day: "ter", movie: 5, series: 3, book: 2, game: 1, comic: 2, manga: 1 },
  { day: "qua", movie: 2, series: 5, book: 3, game: 2, comic: 1, manga: 3 },
  { day: "qui", movie: 6, series: 4, book: 1, game: 4, comic: 2, manga: 2 },
  { day: "sex", movie: 4, series: 7, book: 2, game: 3, comic: 3, manga: 2 },
  { day: "sáb", movie: 8, series: 6, book: 4, game: 5, comic: 4, manga: 3 },
  { day: "dom", movie: 7, series: 5, book: 5, game: 6, comic: 2, manga: 4 },
];

/**
 * Semana de pulso derivada da evolução mensal real: distribui o volume dos
 * últimos pontos com a curva dia-a-dia do protótipo. Sem evolução, fallback.
 */
export function pulseWeekFromEvolucao(
  evolucao: { mes: string; total: number }[] | null,
): PulseDay[] {
  if (!evolucao || evolucao.length === 0) return PULSE_FALLBACK;
  const recentes = evolucao.slice(-3);
  const soma = recentes.reduce((a, p) => a + p.total, 0);
  const fator = soma > 0 ? soma / 42 : 1;
  return PULSE_FALLBACK.map((dia) => ({
    day: dia.day,
    movie: Math.max(0, Math.round(dia.movie * fator)),
    series: Math.max(0, Math.round(dia.series * fator)),
    game: Math.max(0, Math.round(dia.game * fator)),
    book: Math.max(0, Math.round(dia.book * fator)),
    comic: Math.max(0, Math.round(dia.comic * fator)),
    manga: Math.max(0, Math.round(dia.manga * fator)),
  }));
}

export interface Achievement {
  niche: OverviewNiche;
  titleKey: string;
  detailKey: string;
}

/** Catálogo de conquistas — 1 por nicho, como no protótipo. */
export const ACHIEVEMENT_CATALOG: Achievement[] = NICHE_ORDER.map((niche) => ({
  niche,
  titleKey: `achv${cap(niche)}Title`,
  detailKey: `achv${cap(niche)}Detail`,
}));

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface TrendPoint {
  month: string;
  nota: number;
  comunidade: number;
  itens: number;
}

/** Dataset estático de demonstração do protótipo (sem endpoint na API). */
export const TREND_SERIES: Record<"30 dias" | "90 dias" | "12 meses", TrendPoint[]> = {
  "30 dias": [
    { month: "sem 1", nota: 8.1, comunidade: 7.7, itens: 2 },
    { month: "sem 2", nota: 8.3, comunidade: 7.8, itens: 3 },
    { month: "sem 3", nota: 8.5, comunidade: 7.8, itens: 2 },
    { month: "sem 4", nota: 8.7, comunidade: 7.9, itens: 5 },
  ],
  "90 dias": [
    { month: "nov", nota: 7.6, comunidade: 7.5, itens: 6 },
    { month: "dez", nota: 7.4, comunidade: 7.5, itens: 5 },
    { month: "jan", nota: 8.0, comunidade: 7.6, itens: 7 },
    { month: "fev", nota: 8.1, comunidade: 7.7, itens: 8 },
    { month: "mar", nota: 8.4, comunidade: 7.8, itens: 9 },
    { month: "abr", nota: 8.7, comunidade: 7.9, itens: 12 },
  ],
  "12 meses": [
    { month: "out", nota: 7.2, comunidade: 7.4, itens: 4 },
    { month: "nov", nota: 7.6, comunidade: 7.5, itens: 6 },
    { month: "dez", nota: 7.4, comunidade: 7.5, itens: 5 },
    { month: "jan", nota: 8.0, comunidade: 7.6, itens: 7 },
    { month: "fev", nota: 8.1, comunidade: 7.7, itens: 8 },
    { month: "mar", nota: 8.4, comunidade: 7.8, itens: 9 },
    { month: "abr", nota: 8.7, comunidade: 7.9, itens: 12 },
  ],
};

export interface RecentSignal {
  title: string;
  detailKey: string;
  timeKey: string;
  score: string;
  niche: OverviewNiche;
}

/** Dataset estático de demonstração do protótipo (sem endpoint na API). */
export const RECENT_SIGNALS: RecentSignal[] = [
  {
    title: "Ruptura",
    detailKey: "recentDone",
    timeKey: "recentHours:2",
    score: "9,4",
    niche: "series",
  },
  {
    title: "Hades",
    detailKey: "recentFav",
    timeKey: "recentYesterday",
    score: "8,9",
    niche: "game",
  },
  {
    title: "Piranesi",
    detailKey: "recentRated",
    timeKey: "recentDays:3",
    score: "8,7",
    niche: "book",
  },
  {
    title: "O Menu",
    detailKey: "recentDropped",
    timeKey: "recentDays:5",
    score: "6,2",
    niche: "movie",
  },
];

/** "8.8/10" ou "93/100", com vírgula decimal pt-BR como no protótipo. */
export function formatScoreValue(score: number, max: number): string {
  if (max === 100) return `${score}/100`;
  return `${score.toFixed(1).replace(".", ",")}/10`;
}

/** Períodos do seletor do hero (protótipo: 30 dias / 90 dias / 12 meses). */
export type OverviewPeriod = "30 dias" | "90 dias" | "12 meses";

export const OVERVIEW_PERIODS: OverviewPeriod[] = ["30 dias", "90 dias", "12 meses"];

export interface PeriodSeries {
  labels: string[];
  /** Índice de curiosidade (0-100). */
  taste: number[];
  /** Volume de atividade por janela. */
  activity: number[];
  rated: number;
}

/**
 * Séries por período do protótipo — a evolução mensal real da API
 * (`/api/v1/user/stats`) não tem índice de curiosidade nem janelas de 30/90
 * dias; dataset estático de demonstração isolado p/ troca futura.
 */
export const PERIOD_SERIES: Record<OverviewPeriod, PeriodSeries> = {
  "30 dias": {
    labels: ["05 ago", "10 ago", "15 ago", "20 ago", "25 ago", "30 ago", "05 set"],
    taste: [61, 66, 64, 71, 73, 78, 82],
    activity: [3, 4, 2, 5, 6, 4, 8],
    rated: 12,
  },
  "90 dias": {
    labels: ["jun", "jul", "ago", "set"],
    taste: [58, 64, 73, 82],
    activity: [9, 14, 18, 24],
    rated: 28,
  },
  "12 meses": {
    labels: ["out", "dez", "fev", "abr", "jun", "ago", "set"],
    taste: [42, 49, 55, 59, 64, 73, 82],
    activity: [8, 13, 18, 20, 27, 34, 42],
    rated: 51,
  },
};

/** Delta percentual do índice por período (legenda dos cards, protótipo). */
export const PERIOD_DELTA: Record<OverviewPeriod, string> = {
  "30 dias": "+8,4%",
  "90 dias": "+16,8%",
  "12 meses": "+24,6%",
};

export interface ActivityItem {
  titleKey: string;
  detailKey: string;
  timeKey: string;
  /** Idade em dias, para o filtro 7/30/365. */
  days: number;
  niche: OverviewNiche;
}

/** Dataset estático de demonstração do protótipo (sem endpoint de feed). */
export const ACTIVITY_FEED: ActivityItem[] = [
  {
    titleKey: "actMedalTitle",
    detailKey: "actMedalDetail",
    timeKey: "recentHours:2",
    days: 0,
    niche: "book",
  },
  {
    titleKey: "actFinishTitle",
    detailKey: "actFinishDetail",
    timeKey: "recentDays:3",
    days: 3,
    niche: "book",
  },
  {
    titleKey: "actEpisodeTitle",
    detailKey: "actEpisodeDetail",
    timeKey: "recentDays:4",
    days: 4,
    niche: "series",
  },
  {
    titleKey: "actNicheTitle",
    detailKey: "actNicheDetail",
    timeKey: "recentDays:5",
    days: 5,
    niche: "game",
  },
  {
    titleKey: "actNoteTitle",
    detailKey: "actNoteDetail",
    timeKey: "recentDays:18",
    days: 18,
    niche: "movie",
  },
  {
    titleKey: "actRecalibTitle",
    detailKey: "actRecalibDetail",
    timeKey: "recentMonths:4",
    days: 120,
    niche: "comic",
  },
];

export interface DiscoveryCard {
  title: string;
  metaKey: string;
  score: number;
  scoreMax: number;
  niche: OverviewNiche;
}

/** Dataset estático de demonstração do protótipo (fallback sem descobertas reais). */
export const DEMO_DISCOVERIES: DiscoveryCard[] = [
  { title: "O Conto da Aia", metaKey: "discMetaCross", score: 9.1, scoreMax: 10, niche: "book" },
  { title: "Disco Elysium", metaKey: "discMetaGame", score: 93, scoreMax: 100, niche: "game" },
  { title: "A Chegada", metaKey: "discMetaMovie", score: 8.8, scoreMax: 10, niche: "movie" },
];

export interface RadarAxis {
  label: string;
  /** Afinidade atual (0-100). */
  value: number;
  /** Afinidade na comparação anterior (0-100, demonstração). */
  previous: number;
}

export const RADAR_DEMO: RadarAxis[] = [
  { label: "Drama", value: 88, previous: 74 },
  { label: "Sci-fi", value: 72, previous: 58 },
  { label: "Crime", value: 58, previous: 61 },
  { label: "Fantasia", value: 79, previous: 66 },
  { label: "Comédia", value: 44, previous: 52 },
  { label: "Ação", value: 67, previous: 62 },
];

/**
 * Radar a partir dos gêneros reais do usuário (top 6, normalizado 0-100).
 * A série "anterior" não existe na API — derivada como demonstração (85% do
 * valor atual). Menos de 3 eixos → dataset de demonstração do protótipo.
 */
export function radarFromStats(generos: Record<string, number>): RadarAxis[] {
  const entradas = Object.entries(generos)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (entradas.length < 3) return RADAR_DEMO;
  const max = entradas[0][1];
  return entradas.map(([label, v]) => ({
    label,
    value: Math.round((v / max) * 100),
    previous: Math.round((v / max) * 85),
  }));
}
