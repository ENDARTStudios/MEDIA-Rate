import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogTypeSections } from "@/components/CatalogTypeSections";
import { mapToMediaItem } from "@/lib/catalog-item";

/**
 * BETA-GAP-11 / T128 — seções por tipo no catálogo.
 *
 * Regras: só tipos com itens REAIS; seção vazia omitida; sem contagem falsa;
 * "Ver todos" aponta para /catalog?type=<tipo>; some quando há filtro ativo;
 * o card usa o slug CANÔNICO da API.
 */

const messages = {
  catalog: {
    filme: "Filmes",
    serie: "Séries",
    game: "Games",
    livro: "Livros",
    comic: "Quadrinhos",
    manga: "Mangás",
    seeAll: "Ver todos",
    loadingCatalog: "Carregando",
    catalogAria: "Catálogo",
  },
};

function media(id: string, title: string, type: string, slug: string) {
  return {
    id,
    title,
    slug,
    type,
    year: 2020,
    posterUrl: null,
    titleLocalized: { pt: title, en: title },
    score: null,
    preview: false,
  };
}

// getCatalog mockado: `total` real por tipo (limit<=1 = contagem); itens p/ linha.
const DATA: Record<string, { total: number; items: unknown[] }> = {
  movie: { total: 2, items: [media("m1", "Filme A", "movie", "filme-a")] },
  series: { total: 1, items: [media("s1", "Série A", "series", "serie-a")] },
  game: { total: 0, items: [] },
  book: { total: 0, items: [] },
  comic: { total: 0, items: [] },
  manga: { total: 0, items: [] },
};

vi.mock("@/lib/api", () => ({
  getCatalog: vi.fn(async (f?: { type?: string }) => {
    const d = f?.type ? DATA[f.type] : undefined;
    return {
      items: d?.items ?? [],
      total: d?.total ?? 0,
      page: 1,
      limit: 12,
      hasMore: false,
      nextCursor: null,
    };
  }),
}));

const spHolder = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => spHolder.params,
}));

vi.mock("@/lib/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Grid pesado (MediaCard/motion) — mock para focar na lógica das seções.
vi.mock("@/components/CatalogGrid", () => ({
  CatalogGrid: ({ medias }: { medias: unknown[] }) => <div data-testid="grid">{medias.length}</div>,
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="pt-BR" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("CatalogTypeSections (BETA-GAP-11/T128)", () => {
  beforeEach(() => {
    spHolder.params = new URLSearchParams();
  });

  it("mostra só tipos com itens reais (omite tipo com total 0)", async () => {
    renderWithProviders(<CatalogTypeSections />);
    expect(await screen.findByTestId("catalog-type-section-movie")).toBeTruthy();
    expect(await screen.findByTestId("catalog-type-section-series")).toBeTruthy();
    expect(screen.queryByTestId("catalog-type-section-game")).toBeNull();
    expect(screen.queryByTestId("catalog-type-section-manga")).toBeNull();
  });

  it("'Ver todos' aponta para /catalog?type=<tipo>", async () => {
    renderWithProviders(<CatalogTypeSections />);
    const link = await screen.findByTestId("catalog-type-see-all-movie");
    expect(link.getAttribute("href")).toBe("/catalog?type=movie");
  });

  it("não renderiza seções quando há filtro de tipo ativo (?type=)", () => {
    spHolder.params = new URLSearchParams("type=movie");
    renderWithProviders(<CatalogTypeSections />);
    expect(screen.queryByTestId("catalog-type-sections")).toBeNull();
  });

  it("mapToMediaItem preserva o slug canônico da API (não slugify)", () => {
    const item = mapToMediaItem(media("m1", "Duna", "book", "duna-livro") as never);
    expect(item.slug).toBe("duna-livro");
    expect(item.tipo).toBe("LIVRO");
  });
});
