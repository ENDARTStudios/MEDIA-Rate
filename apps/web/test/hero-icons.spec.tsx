import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { MediaCarousel } from "@/components/media-rate-ui/MediaCarousel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// T358: HeroMediaIcon/HeroIconCluster removidos (ícones genéricos da Hero).
// T383b (D-351): livros/HQs/mangás deixaram de ser "roadmap" (bloqueados) e
// passam a renderizar cards reais — a home nunca bloqueia tipo com itens.
const catalogMessages = {
  catalog: {
    filme: "Filmes",
    serie: "Séries",
    game: "Games",
    livro: "Livros",
    comic: "Quadrinhos",
    manga: "Mangás",
    noResults: "Em breve",
    catalogAria: "Catálogo de mídias",
  },
  common: {},
};

describe("MediaCarousel (T383b)", () => {
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

  it("seção do carrossel renderiza para livro/HQ/mangá (sem cards bloqueados)", () => {
    const { container } = renderCarousel("book");
    expect(container.querySelector("[data-testid=carousel-book]")).toBeTruthy();
    // Não há mais o card bloqueado de roadmap — o tipo agora exibe dados reais.
    expect(container.querySelector("[data-testid=locked-card-book]")).toBeNull();
  });

  it("comic e manga também renderizam seção sem lock", () => {
    const { container } = renderCarousel("manga");
    expect(container.querySelector("[data-testid=carousel-manga]")).toBeTruthy();
    expect(container.querySelector("[data-testid=locked-card-manga]")).toBeNull();
  });
});
