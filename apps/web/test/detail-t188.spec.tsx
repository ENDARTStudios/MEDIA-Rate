import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mediaMock = {
  id: "m1",
  slug: "bg3",
  title: "Baldur's Gate 3",
  type: "game",
  year: 2023,
  genres: ["RPG"],
  posterUrl: null,
  backdropUrl: null,
  synopsis: "",
  synopsisLocalized: {},
  streaming: [{ name: "PC" }, { name: "PlayStation 5" }],
  cast: [],
  crew: [],
  reviews: [],
  classificacaoIndicativa: null,
  paisOrigem: null,
  franquias: [],
  score: null,
};

vi.mock("@/lib/api", () => ({
  getMediaBySlug: vi.fn(),
  isPreviewTipo: (tipo: string) => ["book", "comic", "manga"].includes(tipo),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.has = () => false;
    return t;
  },
  useLocale: () => "pt-BR",
}));
vi.mock("next/image", () => ({
  default: (p: { src: string; alt?: string; className?: string }) =>
    `<img src="${p.src}" alt="${p.alt ?? ""}" class="${p.className ?? ""}" />`,
}));
vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    `<a href="${href}">${children}</a>`,
}));
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
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({ data: mediaMock, isLoading: false, error: null, refetch: vi.fn() }),
  };
});
vi.mock("@/stores/use-watchlist-store", () => ({
  useWatchlistStore: () => ({
    toggle: vi.fn(async () => undefined),
    isInWatchlist: () => false,
    isIn: () => false,
    getEntryStatus: () => null,
    addToWatchlist: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
    syncFromApi: vi.fn(async () => undefined),
    fetchWatchlist: vi.fn(async () => undefined),
    items: [],
    entries: [],
  }),
}));
vi.mock("@/stores/use-auth-store", () => ({
  useAuthStore: () => ({ isAuthenticated: false }),
}));
vi.mock("@/lib/http", () => ({
  api: { post: vi.fn(async () => undefined) },
  RateLimitedError: class extends Error {},
}));
vi.mock("@/components/media-rate-ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/media-rate-ui")>();
  return {
    ...actual,
    AgeRatingBadge: ({ rating }: { rating: string }) =>
      `<span data-testid="age-badge">${rating}</span>`,
    GenreChipRow: () => `<div data-testid="genre-chips" />`,
    SeriatedScoreTree: ({ units }: { units: unknown[] }) =>
      `<div data-testid="seriated">${units.length} units</div>`,
    AwardsShowcase: () => `<div data-testid="awards" />`,
    FranchiseCarousel: () => `<div data-testid="franchise" />`,
    OriginBadge: () => `<div data-testid="origin" />`,
  };
});
vi.mock("./WatchlistButton", () => ({ WatchlistButton: () => `<button>Watchlist</button>` }));
vi.mock("./MediaScoreModule", () => ({
  MediaScoreModule: () => `<div data-testid="score-module" />`,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => `<button>${children}</button>`,
}));
vi.mock("@/components/ui/rate-limited", () => ({ RateLimited: () => `<div />` }));
vi.mock("@/components/ui/empty-state", () => ({ EmptyState: () => `<div />` }));
vi.mock("@/components/ui/error-state", () => ({ ErrorState: () => `<div />` }));
vi.mock("@radix-ui/react-tabs", () => ({
  Root: ({ children }: { children: React.ReactNode }) => `<div>${children}</div>`,
  List: ({ children }: { children: React.ReactNode }) => `<div>${children}</div>`,
  Trigger: ({ children }: { children: React.ReactNode }) => `<button>${children}</button>`,
  Content: ({ children }: { children: React.ReactNode }) => `<div>${children}</div>`,
}));

import { MediaDetailClient } from "@/components/MediaDetailClient";

describe("MediaDetailClient (T188)", () => {
  it("renderiza o CTA sticky de watchlist no mobile", () => {
    const qc = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MediaDetailClient slug="bg3" initialData={mediaMock as never} />
      </QueryClientProvider>,
    );
    expect(container.querySelector("[data-testid=watchlist-cta-sticky]")).toBeTruthy();
  });

  it("seção de plataformas para games com ícones", () => {
    const qc = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MediaDetailClient slug="bg3" initialData={mediaMock as never} />
      </QueryClientProvider>,
    );
    const plataformas = container.querySelector("[data-testid=platforms-section]");
    expect(plataformas).toBeTruthy();
    expect(plataformas?.textContent).toContain("PlayStation 5");
    expect(plataformas?.querySelector("svg")).toBeTruthy();
  });
});
