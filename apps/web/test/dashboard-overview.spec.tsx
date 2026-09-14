import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type * as NextIntl from "next-intl";

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

// T460: a visão geral busca descobertas reais (T201) e navega com Link —
// ambos precisam de stub leve no ambiente de teste.
vi.mock("@/lib/api-discoveries", () => ({
  getDiscoveries: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/navigation", () => ({
  usePathname: () => "/dashboard",
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
  RECENT_SIGNALS,
  TREND_SERIES,
  formatScoreValue,
  nicheFromApiTipo,
  pulseWeekFromEvolucao,
  radarFromStats,
  taxonomyFromStats,
  unlockedNiches,
} from "@/lib/dashboard-overview-data";

const STATS = {
  tipos: { FILME: 6, SERIE: 3, GAME: 1, LIVRO: 0, COMIC: 0, MANGA: 0 },
  generos: { "Drama": 5, "Sci-fi": 3, "Crime": 2 },
  evolucao: [
    { mes: "2026-01", total: 2 },
    { mes: "2026-02", total: 5 },
  ],
};

function renderOverview() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <DashboardOverview stats={STATS} />
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

  it("catálogos do protótipo têm 6 nichos, 4 sinais, 6 atividades e 3 descobertas", () => {
    expect(ACHIEVEMENT_CATALOG).toHaveLength(6);
    expect(RECENT_SIGNALS).toHaveLength(4);
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
});

describe("DashboardOverview (T460)", () => {
  it("renderiza as 12 seções do protótipo", () => {
    const { getByTestId } = renderOverview();
    for (const id of [
      "dashboard-overview",
      "overview-hero",
      "overview-metrics",
      "overview-radar",
      "overview-evolution",
      "overview-taxonomy",
      "overview-pulse",
      "overview-achievements",
      "overview-feed",
      "overview-trend",
      "overview-trend-aside",
      "overview-discoveries",
      "overview-recent",
      "overview-profile",
      "dashboard-footer",
    ]) {
      expect(getByTestId(id)).toBeTruthy();
    }
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

  it("filtra o feed de atividades por janela", () => {
    renderOverview();
    expect(screen.getAllByText("actMedalTitle").length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText("feedYear"));
    expect(screen.getByText("actRecalibTitle")).toBeTruthy();
  });

  it("renderiza descobertas de demonstração quando a API não responde", async () => {
    renderOverview();
    expect(screen.getByText("O Conto da Aia")).toBeTruthy();
    expect(screen.getByText("Disco Elysium")).toBeTruthy();
    expect(screen.getByText("A Chegada")).toBeTruthy();
  });

  it("F17: toda superfície demo exibe o rótulo de demonstração", () => {
    renderOverview();
    // 3 métricas demo (afinidade, conclusão, descobertas) + evolução +
    // tendência + aside comparativo + feed + fallback de descobertas.
    const badges = screen.getAllByTestId("demo-badge");
    expect(badges.length).toBe(8);
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
