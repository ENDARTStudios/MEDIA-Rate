import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

// Onda 5 admin (P2) — métricas reais de operação sobre /admin/stats.
// Conversão paga = (Plus + Premium) / contas com plano.

const STATS = {
  usuarios: { total: 198, ativos_7d: 12 },
  midias: { total: 625, por_tipo: { FILME: 300, SERIE: 150, GAME: 50 } },
  watchlists: { total_entries: 2100, usuarios_com_watchlist: 80 },
  sessoes: { ativas: 9 },
  planos: { free: 100, plus: 15, premium: 5 },
  descobertas: { total_eventos: 44, usuarios_com_evento: 18 },
  interacoes: { total: 26 },
};

vi.mock("@/lib/http", () => ({
  api: {
    get: vi.fn(async () => STATS),
  },
}));

import AdminMetricasPage from "@/app/[locale]/admin/metricas/page";

function renderPage() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <AdminMetricasPage />
    </NextIntlClientProvider>,
  );
}

describe("AdminMetricasPage (Onda 5 admin — P2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe os KPIs reais de /admin/stats", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("198")).toBeTruthy();
    });
    expect(screen.getByText(/12 ativos nos últimos 7 dias/)).toBeTruthy();
    expect(screen.getByText("625")).toBeTruthy(); // catálogo
    expect(screen.getByText("26")).toBeTruthy(); // interações
    expect(screen.getByText("17%")).toBeTruthy(); // conversão (20/120)
    expect(screen.getByText("44")).toBeTruthy(); // descobertas
  });

  it("mostra o catálogo por tipo", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("FILME")).toBeTruthy();
    });
    expect(screen.getByText("300")).toBeTruthy();
  });
});
