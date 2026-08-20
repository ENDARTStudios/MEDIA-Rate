import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { MediaCarousel } from "@/components/media-rate-ui/MediaCarousel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// T358: HeroMediaIcon/HeroIconCluster removidos (ícones genéricos da Hero).
// Este spec agora cobre apenas MediaCarousel (roadmap de Livro/HQ/Mangá).
const catalogMessages = {
  catalog: {
    filme: "Filmes",
    serie: "Séries",
    game: "Games",
    livro: "Livros",
    comic: "Quadrinhos",
    manga: "Mangás",
    typeMovie: "Filme",
    typeSerie: "Série",
    typeGame: "Game",
    typeBook: "Livro",
    typeComic: "HQ",
    typeManga: "Mangá",
    noResults: "Em breve",
    comingSoonTap: "Em breve — toque para ser avisado",
    comingSoonNotify: "Cadastre-se para ser avisado quando chegar.",
    catalogAria: "Catálogo de mídias",
    exploreCategory: "Explorar {label}",
  },
  common: {},
};

describe("MediaCarousel (T185)", () => {
  function renderCarousel(type: "book" | "comic" | "manga") {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <NextIntlClientProvider locale="pt-BR" messages={catalogMessages}>
          <MediaCarousel type={type} />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );
  }

  it("categorias em roadmap renderizam 5 cards bloqueados", () => {
    const { container } = renderCarousel("book");
    expect(container.querySelectorAll("[data-testid=locked-card-book]").length).toBe(5);
    expect(container.querySelector("[data-testid=carousel-book]")).toBeTruthy();
  });

  it("clique no card bloqueado abre o modal de waitlist (role=dialog)", () => {
    renderCarousel("comic");
    fireEvent.click(screen.getAllByTestId("locked-card-comic")[0]);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
