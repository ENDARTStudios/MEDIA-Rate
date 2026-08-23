import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { MediaCarousel } from "@/components/media-rate-ui/MediaCarousel";
import type { CatalogResponse } from "@/lib/types";

// T405/D-399 U2: a ilha CarouselInteractions usa next/navigation + next-intl
// (indisponíveis em renderToStaticMarkup puro). O teste cobre o SHELL estático
// dos cards — a ilha vira um passthrough.
vi.mock("@/components/media-rate-ui/CarouselInteractions", () => ({
  CarouselInteractions: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// T383b (D-351): livros/HQs/mangás deixaram de ser "roadmap" (bloqueados) e
// passam a renderizar cards reais — a home nunca bloqueia tipo com itens.
// T405 (D-380): MediaCarousel virou SERVER COMPONENT (props-driven, sem hooks
// de next-intl) — testável via SSR estático, sem providers de query/intl.
const tWatchlist = (key: string) => key;
const tInteraction = (key: string) => key;

const tCatalog = (key: string) =>
  (
    ({
      filme: "Filmes",
      serie: "Séries",
      game: "Games",
      livro: "Livros",
      comic: "Quadrinhos",
      manga: "Mangás",
      noResults: "Em breve",
    }) as Record<string, string>
  )[key] ?? key;

const emptyCatalog: CatalogResponse = {
  items: [],
  total: 0,
  page: 1,
  limit: 10,
  hasMore: false,
};

describe("MediaCarousel (T383b)", () => {
  function renderCarousel(type: "book" | "comic" | "manga") {
    return renderToStaticMarkup(
      <MediaCarousel
        type={type}
        initialData={emptyCatalog}
        tCatalog={tCatalog}
        tWatchlist={tWatchlist}
        tInteraction={tInteraction}
        locale="pt-BR"
      />,
    );
  }

  it("seção do carrossel renderiza para livro/HQ/mangá (sem cards bloqueados)", () => {
    const html = renderCarousel("book");
    expect(html).toContain('data-testid="carousel-book"');
    // Não há mais o card bloqueado de roadmap — o tipo agora exibe dados reais.
    expect(html).not.toContain("locked-card-book");
  });

  it("comic e manga também renderizam seção sem lock", () => {
    expect(renderCarousel("comic")).toContain('data-testid="carousel-comic"');
    expect(renderCarousel("manga")).toContain('data-testid="carousel-manga"');
    expect(renderCarousel("manga")).not.toContain("locked-card-manga");
  });
});
