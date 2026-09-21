import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type * as NextIntl from "next-intl";
import type * as ApiInteracoes from "@/lib/api-interacoes";

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof NextIntl>();
  return {
    ...actual,
    useTranslations: () => {
      const t = (key: string, params?: Record<string, unknown>) =>
        params ? `${key}:${JSON.stringify(params)}` : key;
      return t;
    },
    useLocale: () => "pt-BR",
  };
});

// T460: a visão geral busca descobertas reais (T201), atividades reais
// (interações) e navega com Link/router — stubs leves no ambiente de teste.
vi.mock("@/lib/api-discoveries", () => ({
  getDiscoveries: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/api-interacoes", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiInteracoes>();
  return { ...actual, getInteracoes: vi.fn().mockResolvedValue(null) };
});
vi.mock("@/lib/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
    <a {...props}>{children}</a>
  ),
}));

class ResizeObserverStub {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import {
  ACHIEVEMENT_CATALOG,
  ACTIVITY_FEED,
  DEMO_DISCOVERIES,
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
} from "@/lib/dashboard-overview-data";

const STATS = {
  plano: "PREMIUM",
  total: 10,
  concluidos: 7,
  tipos: { FILME: 6, SERIE: 3, GAME: 1, LIVRO: 0, COMIC: 0, MANGA: 0 },
  generos: { "Drama": 5, "Sci-fi": 3, "Crime": 2 },
  evolucao: [
    { mes: "2026-01", total: 2 },
    { mes: "2026-02", total: 5 },
  ],
  streak: 3,
  histograma: [
    { faixa: "0-2", total: 0 },
    { faixa: "2-4", total: 1 },
    { faixa: "4-6", total: 2 },
    { faixa: "6-8", total: 4 },
    { faixa: "8-10", total: 3 },
  ],
};

function renderOverview(stats: typeof STATS = STATS) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <DashboardOverview stats={stats} />
    </NextIntlClientProvider>,
  );
}

describe("dashboard-overview-data (T460)", () => {
  it("taxonomyFromStats normaliza pct e ordena por valor", () => {
    const bars = taxonomyFromStats(STATS.tipos);
    expect(bars).toHaveLength(6);
    expect(bars[0].niche).toBe("movie");
    expect(bars.reduce((a, b) => a + b.pct, 0)).toBeGreaterThan(95);
  });

  it("unlockedNiches reflete nichos com sinais", () => {
    expect(unlockedNiches(STATS.tipos)).toEqual(["movie", "series", "game"]);
  });

  it("pulseWeekFromEvolucao gera 7 dias e usa fallback sem dados", () => {
    expect(pulseWeekFromEvolucao(STATS.evolucao)).toHaveLength(7);
    expect(pulseWeekFromEvolucao(null)).toHaveLength(7);
  });

  it("formatScoreValue usa vírgula pt-BR e /100 para games", () => {
    expect(formatScoreValue(8.8, 10)).toBe("8,8/10");
    expect(formatScoreValue(93, 100)).toBe("93/100");
  });

  it("catálogos do protótipo têm 6 nichos, 6 atividades e 3 descobertas", () => {
    expect(ACHIEVEMENT_CATALOG).toHaveLength(6);
    expect(ACTIVITY_FEED).toHaveLength(6);
    expect(DEMO_DISCOVERIES).toHaveLength(3);
    expect(Object.keys(TREND_SERIES)).toEqual(["30 dias", "90 dias", "12 meses"]);
    expect(OVERVIEW_PERIODS).toEqual(["30 dias", "90 dias", "12 meses"]);
    expect(Object.keys(PERIOD_SERIES)).toEqual(["30 dias", "90 dias", "12 meses"]);
  });

  it("radarFromStats deriva eixos dos gêneros reais e cai no demo com <3", () => {
    const eixos = radarFromStats(STATS.generos);
    expect(eixos).toHaveLength(3);
    expect(eixos[0].label).toBe("Drama");
    expect(eixos[0].value).toBe(100);
    expect(eixos[0].previous).toBeLessThanOrEqual(eixos[0].value);
    const demo = radarFromStats({ Drama: 2 });
    expect(demo).toHaveLength(6);
    expect(demo[0].label).toBe("Drama");
  });

  it("nicheFromApiTipo mapeia o enum da API e cai em movie p/ desconhecido", () => {
    expect(nicheFromApiTipo("FILME")).toBe("movie");
    expect(nicheFromApiTipo("serie")).toBe("series");
    expect(nicheFromApiTipo("GAME")).toBe("game");
    expect(nicheFromApiTipo("desconhecido")).toBe("movie");
  });

  it("nicheLabelKey resolve a chave real do namespace catalog (movie→filme)", () => {
    // tc("movie")/tc("book") quebram em runtime (MISSING_MESSAGE) — o nicho
    // da UI nunca é chave de mensagem direta.
    expect(nicheLabelKey("movie")).toBe("filme");
    expect(nicheLabelKey("series")).toBe("serie");
    expect(nicheLabelKey("book")).toBe("livro");
    expect(nicheLabelKey("comic")).toBe("comic");
    expect(nicheLabelKey("manga")).toBe("manga");
  });

  it("affinityFromHistograma/completionPct derivam métricas reais (auditoria S1)", () => {
    // média ponderada dos pontos médios: (3·1+5·2+7·4+9·3)/10 = 6,8
    expect(affinityFromHistograma(STATS.histograma)).toBeCloseTo(6.8, 5);
    expect(affinityFromHistograma(STATS.histograma.map((h) => ({ ...h, total: 0 })))).toBeNull();
    expect(completionPct(10, 7)).toBe(70);
    expect(completionPct(0, 0)).toBeNull();
  });
});

describe("DashboardOverview (T460 + auditoria S1)", () => {
  it("renderiza as seções consolidadas (radar/evolução/taxonomia/pulso reais no Premium)", () => {
    const { getByTestId } = renderOverview();
    for (const id of [
      "dashboard-overview",
      "overview-hero",
      "overview-metrics",
      "overview-consistency",
      "overview-radar",
      "overview-evolution",
      "overview-taxonomy",
      "overview-pulse",
      "overview-achievements",
      "overview-feed",
      "overview-trend",
      "overview-trend-aside",
      "overview-discoveries",
      "overview-profile",
      "overview-profile-numbers",
      "dashboard-footer",
    ]) {
      expect(getByTestId(id)).toBeTruthy();
    }
  });

  it("métricas reais: total/conclusão/afinidade derivam da resposta da API", () => {
    renderOverview();
    expect(screen.getAllByText("10").length).toBeGreaterThanOrEqual(1); // total (card + números)
    expect(screen.getAllByText("70%").length).toBeGreaterThanOrEqual(1); // conclusão 7/10
    expect(screen.getAllByText("6,8").length).toBeGreaterThanOrEqual(1); // afinidade
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1); // streak
  });

  it("gating T402: Free vê 4 previews (radar/evolução/taxonomia/pulso)", () => {
    renderOverview({ ...STATS, plano: "FREE" });
    expect(screen.getAllByTestId("gated-preview")).toHaveLength(4);
    // streak/histograma continuam visíveis para o Free (T396: todos os planos).
    expect(screen.getByTestId("overview-consistency")).toBeTruthy();
  });

  it("gating T402: Plus vê 2 previews (evolução/pulso) e radar real", () => {
    renderOverview({ ...STATS, plano: "PLUS" });
    expect(screen.getAllByTestId("gated-preview")).toHaveLength(2);
    expect(screen.getByTestId("overview-radar")).toBeTruthy();
    expect(screen.getByTestId("overview-taxonomy")).toBeTruthy();
  });

  it("mostra 3/6 desbloqueadas e filtra conquistas", () => {
    renderOverview();
    expect(screen.getAllByText("3 / 6").length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText("achvUnlocked"));
    expect(screen.getByText("achvMovieTitle")).toBeTruthy();
  });

  it("troca período do hero, período do gráfico e modo do gráfico de tendência", () => {
    renderOverview();
    const botoesPeriodo = screen.getAllByText("period30");
    expect(botoesPeriodo.length).toBeGreaterThanOrEqual(2); // hero + tendência
    fireEvent.click(botoesPeriodo[0]);
    fireEvent.click(screen.getByText("trendBars"));
    // Resumo da tendência aparece no card e no aside comparativo.
    expect(screen.getAllByText(/trendPhraseUp/).length).toBeGreaterThanOrEqual(2);
  });

  it("filtra o feed de atividades por janela (fallback demo rotulado)", () => {
    renderOverview();
    expect(screen.getAllByText("actMedalTitle").length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText("feedYear"));
    expect(screen.getByText("actRecalibTitle")).toBeTruthy();
  });

  it("feed de atividades real: interações do usuário viram linhas do feed", async () => {
    const { getInteracoes } = await import("@/lib/api-interacoes");
    vi.mocked(getInteracoes).mockResolvedValue({
      items: [
        {
          id: "i1",
          midiaId: "m1",
          status: "CONCLUIDO",
          atualizadoEm: new Date(Date.now() - 3 * 3600_000).toISOString(),
          midia: {
            id: "m1",
            slug: "duna",
            titulo: "Duna",
            tipo: "FILME",
            anoLancamento: 2021,
            imagemUrl: null,
            score: 82,
          },
        },
        {
          id: "i2",
          midiaId: "m2",
          status: "CONSUMINDO",
          atualizadoEm: new Date(Date.now() - 2 * 86400_000).toISOString(),
          midia: {
            id: "m2",
            slug: "hades",
            titulo: "Hades",
            tipo: "GAME",
            anoLancamento: 2020,
            imagemUrl: null,
            score: 93,
          },
        },
      ],
      total: 2,
      porStatus: { QUERO_CONSUMIR: 0, CONSUMINDO: 1, CONCLUIDO: 1, ABANDONADO: 0 },
      nextCursor: null,
    });
    renderOverview();
    expect(await screen.findByText("Duna")).toBeTruthy();
    expect(screen.getByText("completed")).toBeTruthy();
    expect(screen.getByText("watching")).toBeTruthy();
    expect(screen.getByText("82/100")).toBeTruthy(); // MEDIA Score™ 0-100
    // Fallback demo some quando há dados reais.
    expect(screen.queryByText("actMedalTitle")).toBeNull();
  });

  it("renderiza descobertas de demonstração quando a API não responde", async () => {
    renderOverview();
    expect(screen.getByText("O Conto da Aia")).toBeTruthy();
    expect(screen.getByText("Disco Elysium")).toBeTruthy();
    expect(screen.getByText("A Chegada")).toBeTruthy();
  });

  it("F17: toda superfície demo exibe o rótulo de demonstração", () => {
    renderOverview();
    // Premium com dados reais: pulso (distribuição derivada), tendência,
    // aside comparativo, feed (fallback) e descobertas (fallback).
    const badges = screen.getAllByTestId("demo-badge");
    expect(badges.length).toBe(5);
    expect(badges.every((b) => b.textContent === "demoBadge")).toBe(true);
  });

  it("F17: sem 'gerar link público' (rota inexistente — Thinker)", () => {
    renderOverview();
    expect(screen.queryByText("profilePublicLink")).toBeNull();
    expect(screen.queryByText("profileLinkCopied")).toBeNull();
    // Compartilhamento mantém Web Share + redes (URL atual).
    expect(screen.getByText("profileWebShare")).toBeTruthy();
  });
});

describe("DashboardSidebar (T460)", () => {
  function renderSidebar() {
    return render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <DashboardSidebar />
      </NextIntlClientProvider>,
    );
  }

  it("renderiza navegação, atalhos e card de usuário visitante", () => {
    renderSidebar();
    expect(screen.getByTestId("dashboard-sidebar")).toBeTruthy();
    expect(screen.getByText("navOverview")).toBeTruthy();
    expect(screen.getByText("navDiscoveries")).toBeTruthy();
    expect(screen.getByText("navLibrary")).toBeTruthy();
    expect(screen.getByText("navGoals")).toBeTruthy();
    expect(screen.getByText("navWantToSee")).toBeTruthy();
    expect(screen.getByText("navFavorites")).toBeTruthy();
    expect(screen.getByText("navGuest")).toBeTruthy();
    expect(screen.getByText("planFree")).toBeTruthy();
  });

  it("recolhe para o modo compacto", () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText("navCollapse"));
    expect(screen.queryByText("navOverview")).toBeNull();
  });
});
