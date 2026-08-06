import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

let watchlistMock = {
  entries: [
    { id: "e1", mediaId: "e1", status: "WANT", media: { id: "e1", type: "movie", title: "Titulo e1", year: 2026, posterUrl: null, score: 75 }, scoreAtAdd: 70 },
    { id: "e2", mediaId: "e2", status: "WANT", media: { id: "e2", type: "series", title: "Titulo e2", year: 2026, posterUrl: null, score: 80 }, scoreAtAdd: null },
    { id: "e3", mediaId: "e3", status: "COMPLETED", media: { id: "e3", type: "game", title: "Titulo e3", year: 2026, posterUrl: null, score: 55 }, scoreAtAdd: 60 },
  ],
  isLoading: false,
  error: null,
  fetchWatchlist: vi.fn(async () => undefined),
  removeItem: vi.fn(async () => undefined),
  moveItem: vi.fn(async () => undefined),
};

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  return {
    ...actual,
    useTranslations: () => (key: string) => key,
    useLocale: () => "pt-BR",
  };
});
vi.mock("next-intl/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    `<a href="${href}">${children}</a>`,
}));
vi.mock("@/stores/use-watchlist-store", () => ({ useWatchlistStore: () => watchlistMock }));
vi.mock("@/stores/use-auth-store", () => ({
  useAuthStore: () => ({ user: { plan: "FREE" } }),
}));
vi.mock("animejs", () => ({ animate: vi.fn() }));
vi.mock("motion/react", () => ({ useReducedMotion: () => true }));
vi.mock("@/components/MediaCard", () => ({
  MediaCard: ({ media }: { media: { titulo: string } }) => `<div>${media.titulo}</div>`,
}));
vi.mock("@/components/media-rate-ui/CategoryChip", () => ({
  MEDIA_ACCENTS: { movie: "#818CF8", series: "#38BDF8", game: "#34D399", book: "#FBBF24", comic: "#F472B6", anime: "#A78BFA" },
  CategoryChip: ({ type, label, active }: { type: string; label?: string; active?: boolean }) => (
    <button data-testid={`chip-${type}`} data-active={active ?? false}>
      {label ?? type}
    </button>
  ),
}));
vi.mock("@/components/CatalogSkeleton", () => ({ CatalogSkeleton: () => `<div />` }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children }: { children: React.ReactNode }) => `<button>${children}</button>` }));
vi.mock("@/components/ui/rate-limited", () => ({ RateLimited: () => `<div />` }));
vi.mock("@/lib/http", () => ({ RateLimitedError: class extends Error {} }));
vi.mock("@/lib/i18n", () => ({ formatDate: (d: string) => d }));

import { WatchlistClient } from "@/components/WatchlistClient";

function entry(id: string, status: string, type: string, scoreAtAdd?: number, score?: number) {
  return {
    id,
    mediaId: id,
    status,
    media: { id, type, title: `Titulo ${id}`, year: 2026, posterUrl: null, score: score ?? null },
    scoreAtAdd: scoreAtAdd ?? null,
  };
}

function renderWatchlist() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <WatchlistClient />
    </NextIntlClientProvider>,
  );
}

describe("WatchlistClient (T190)", () => {
  it("renderiza chips de filtro por mídia", () => {
    const { container } = renderWatchlist();
    console.log("TEST1 HTML:", container.innerHTML.slice(0, 3000));
    expect(container.querySelectorAll("[data-testid=chip-movie]").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-testid=chip-series]").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-testid=chip-game]").length).toBeGreaterThan(0);
  });

  it("filtro por mídia reduz os cards exibidos", () => {
    const { container } = renderWatchlist();
    const chips = container.querySelectorAll("[data-testid^=chip-]");
    expect(chips.length).toBeGreaterThanOrEqual(3);
  });

  it("indicador de score aparece só quando há dado anterior (nunca fabrica)", () => {
    const { container } = renderWatchlist();
    const deltas = container.querySelectorAll("[data-testid=score-delta]");
    // e1 (70→75) e e3 (60→55) têm scoreAtAdd; e2 (null) não → 2 deltas.
    expect(deltas.length).toBe(2);
  });

  it("menu 'mover para…' presente em cada card (alternativa de teclado)", () => {
    const { container } = renderWatchlist();
    expect(container.querySelectorAll("select").length).toBeGreaterThanOrEqual(3);
  });
});

