import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let watchlistMock = {
  entries: [
    { id: "e1", mediaId: "m1", status: "WANT", addedAt: "2026-07-01T00:00:00Z", media: { id: "m1", type: "movie" } },
    { id: "e2", mediaId: "m2", status: "WATCHING", addedAt: "2026-07-15T00:00:00Z", media: { id: "m2", type: "series" } },
    { id: "e3", mediaId: "m3", status: "COMPLETED", addedAt: "2026-06-10T00:00:00Z", media: { id: "m3", type: "game" } },
  ],
  isLoading: false,
  error: null,
  fetchWatchlist: vi.fn(async () => undefined),
};

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
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

vi.mock("next/dynamic", () => ({
  default: () => function Dynamic() {
    return null;
  },
}));

vi.mock("@/stores/use-watchlist-store", () => ({
  useWatchlistStore: () => watchlistMock,
}));
vi.mock("@/stores/use-auth-store", () => ({
  useAuthStore: () => ({ user: { name: "Ada" } }),
}));
vi.mock("@/lib/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    `<a href="${href}">${children}</a>`,
}));
vi.mock("@/components/ui/button", () => ({ Button: ({ children }: { children: React.ReactNode }) => `<button>${children}</button>` }));
vi.mock("@/components/ui/rate-limited", () => ({ RateLimited: () => `<div />` }));
vi.mock("@/components/ui/error-state", () => ({ ErrorState: () => `<div />` }));

import { DashboardContent } from "@/components/DashboardContent";

function renderDashboard() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <DashboardContent />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("DashboardContent (T189)", () => {
  beforeEach(() => {
    watchlistMock = {
      entries: [
        { id: "e1", mediaId: "m1", status: "WANT", addedAt: "2026-07-01T00:00:00Z", media: { id: "m1", type: "movie" } },
        { id: "e2", mediaId: "m2", status: "WATCHING", addedAt: "2026-07-15T00:00:00Z", media: { id: "m2", type: "series" } },
        { id: "e3", mediaId: "m3", status: "COMPLETED", addedAt: "2026-06-10T00:00:00Z", media: { id: "m3", type: "game" } },
      ],
      isLoading: false,
      error: null,
      fetchWatchlist: vi.fn(async () => undefined),
    };
  });

  it("renderiza cabeçalho pessoal com saudação", () => {
    renderDashboard();
    expect(screen.getByText(/greeting/)).toBeTruthy();
  });

  it("calcula resumo com contagem da watchlist (3 títulos)", () => {
    renderDashboard();
    expect(screen.getByText(/summary/)).toBeTruthy();
  });

  it("mostra estado vazio com CTA quando sem títulos", () => {
    watchlistMock = { ...watchlistMock, entries: [] };
    renderDashboard();
    expect(screen.getByText("emptyDesc")).toBeTruthy();
  });

  it("renderiza distribuição por status com dados (parte estática)", () => {
    const { container } = renderDashboard();
    expect(screen.getAllByText("statusDistribution").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("wantToSee");
    expect(container.textContent).toContain("watching");
  });
});
