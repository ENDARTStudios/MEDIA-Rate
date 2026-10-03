import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type * as NextIntl from "next-intl";
import type { WatchlistEntry } from "@/stores/use-watchlist-store";

const entriesMock: WatchlistEntry[] = (
  [
    ["e1", "movie", "Titulo e1", 75],
    ["e2", "series", "Titulo e2", 80],
    ["e3", "game", "Titulo e3", 55],
    ["e4", "book", "Titulo e4", 8],
    ["e5", "comic", "Titulo e5", 7],
    ["e6", "manga", "Titulo e6", 9],
  ] as const
).map(([id, type, title, score]) => ({
  id,
  mediaId: id,
  status: "WANT",
  media: { id, type, title, year: 2026, posterUrl: null, score },
  scoreAtAdd: null,
}));

const watchlistMock = {
  entries: entriesMock,
  isLoading: false,
  error: null,
  fetchWatchlist: vi.fn(async () => undefined),
  removeItem: vi.fn(async () => undefined),
  moveItem: vi.fn(async () => undefined),
};

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof NextIntl>();
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
vi.mock("@/stores/use-interaction-store", () => ({
  useInteractionStore: (sel: (s: unknown) => unknown) =>
    sel({
      map: {},
      fetchAll: vi.fn(async () => undefined),
      setStatus: vi.fn(async () => undefined),
      setReaction: vi.fn(async () => undefined),
      setMotivo: vi.fn(async () => undefined),
    }),
}));
vi.mock("@/stores/use-auth-store", () => ({
  useAuthStore: () => ({ user: { plan: "FREE" } }),
}));
vi.mock("animejs", () => ({ animate: vi.fn() }));
vi.mock("motion/react", () => ({ useReducedMotion: () => true }));
vi.mock("@/components/MediaCard", () => ({
  MediaCard: ({ media }: { media: { titulo: string } }) => `<div>${media.titulo}</div>`,
}));
vi.mock("@/components/media-rate-ui/CategoryChip", () => ({
  MEDIA_ACCENTS: {
    movie: "#818CF8",
    series: "#38BDF8",
    game: "#34D399",
    book: "#FBBF24",
    comic: "#F472B6",
    manga: "#A78BFA",
  },
  CategoryChip: ({
    type,
    count,
    onClick,
  }: {
    type: string;
    count?: number;
    onClick?: () => void;
  }) => (
    <button data-testid={`chip-${type}`} data-count={count ?? ""} onClick={onClick}>
      {type}
    </button>
  ),
}));
vi.mock("@/components/CatalogSkeleton", () => ({ CatalogSkeleton: () => `<div />` }));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => `<button>${children}</button>`,
}));
vi.mock("@/components/ui/rate-limited", () => ({ RateLimited: () => `<div />` }));
vi.mock("@/lib/http", () => ({ RateLimitedError: class extends Error {} }));
vi.mock("@/lib/i18n", () => ({ formatDate: (d: string) => d }));

import { WatchlistClient } from "@/components/WatchlistClient";
import { entryToMediaItem } from "@/components/watchlist/WatchlistCard";

function entryComTipo(type: string): WatchlistEntry {
  return {
    id: "x1",
    mediaId: "m1",
    status: "WANT",
    media: { id: "m1", type, title: "T", year: 2026, posterUrl: null, score: 7 },
  };
}

describe("watchlist 6 tipos (D-233) — Livros/Quadrinhos/Mangás na watchlist", () => {
  it("entryToMediaItem mapeia os 6 tipos (fallback nunca inventa FILME)", () => {
    expect(entryToMediaItem(entryComTipo("movie"))?.tipo).toBe("FILME");
    expect(entryToMediaItem(entryComTipo("series"))?.tipo).toBe("SERIE");
    expect(entryToMediaItem(entryComTipo("game"))?.tipo).toBe("GAME");
    expect(entryToMediaItem(entryComTipo("book"))?.tipo).toBe("LIVRO");
    expect(entryToMediaItem(entryComTipo("comic"))?.tipo).toBe("COMIC");
    expect(entryToMediaItem(entryComTipo("manga"))?.tipo).toBe("MANGA");
  });

  it("entryToMediaItem tolera valores legados (livro/quadrinho) sem virar FILME", () => {
    expect(entryToMediaItem(entryComTipo("livro"))?.tipo).toBe("LIVRO");
    expect(entryToMediaItem(entryComTipo("quadrinho"))?.tipo).toBe("COMIC");
  });

  it("renderiza chips dos 6 tipos com contagens", () => {
    const { container } = render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <WatchlistClient />
      </NextIntlClientProvider>,
    );
    for (const tipo of ["movie", "series", "game", "book", "comic", "manga"]) {
      expect(container.querySelector(`[data-testid=chip-${tipo}]`)).not.toBeNull();
    }
    const all = container.querySelector("[data-testid=chip-movie]");
    expect(all?.getAttribute("data-count")).toBe("6");
    expect(container.querySelector("[data-testid=chip-book]")?.getAttribute("data-count")).toBe(
      "1",
    );
    expect(container.querySelector("[data-testid=chip-manga]")?.getAttribute("data-count")).toBe(
      "1",
    );
  });

  it("filtro por livro/mangá reduz os cards aos do tipo", () => {
    const { container } = render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <WatchlistClient />
      </NextIntlClientProvider>,
    );
    // todos os 6 na visão default
    expect(container.querySelectorAll("select").length).toBe(6);
    fireEvent.click(container.querySelector("[data-testid=chip-book]") as Element);
    expect(container.querySelectorAll("select").length).toBe(1);
    fireEvent.click(container.querySelector("[data-testid=chip-manga]") as Element);
    expect(container.querySelectorAll("select").length).toBe(1);
  });
});
