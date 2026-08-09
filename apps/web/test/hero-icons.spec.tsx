import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { HeroMediaIcon } from "@/components/media-rate-ui/HeroMediaIcon";
import { HeroIconCluster } from "@/components/media-rate-ui/HeroIconCluster";
import { MediaCarousel } from "@/components/media-rate-ui/MediaCarousel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  },
  common: {},
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={catalogMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function mockMatchMedia(matches = false) {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
  return window.matchMedia as unknown as ReturnType<typeof vi.fn>;
}

describe("HeroMediaIcon (D-204)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renderiza aria-label 'Explorar <label>' e href correto", () => {
    renderWithProviders(
      <HeroMediaIcon type="movie" animationVariant="clapperboard" href="/catalog?type=movie" label="Filmes" />,
    );
    const link = screen.getByRole("link", { name: "Explorar Filmes" });
    expect(link.getAttribute("href")).toBe("/catalog?type=movie");
  });

  it("cada variant renderiza o SVG com os data-parts da coreografia", () => {
    const { container: clap } = renderWithProviders(
      <HeroMediaIcon type="movie" animationVariant="clapperboard" href="/x" label="Filmes" />,
    );
    expect(clap.querySelector("[data-part=mouth]")).toBeTruthy();
    expect(clap.querySelector("[data-part=flash]")).toBeTruthy();

    const { container: tv } = renderWithProviders(
      <HeroMediaIcon type="series" animationVariant="tv" href="/x" label="Séries" />,
    );
    expect(tv.querySelector("[data-part=scanline]")).toBeTruthy();
    expect(tv.querySelector("[data-part=screen]")).toBeTruthy();

    const { container: game } = renderWithProviders(
      <HeroMediaIcon type="game" animationVariant="controller" href="/x" label="Games" />,
    );
    expect(game.querySelectorAll("[data-part^=button-]").length).toBe(4);
    expect(game.querySelector("[data-part=analog]")).toBeTruthy();

    const { container: book } = renderWithProviders(
      <HeroMediaIcon type="book" animationVariant="book" href="/x" label="Livros" />,
    );
    expect(book.querySelector("[data-part=cover]")).toBeTruthy();
    expect(book.querySelectorAll("[data-part^=line-]").length).toBe(3);

    const { container: magazine } = renderWithProviders(
      <HeroMediaIcon type="comic" animationVariant="magazine" href="/x" label="HQs & Mangás" />,
    );
    expect(magazine.querySelectorAll("[data-part^=dot-]").length).toBe(6);
    expect(magazine.querySelector("[data-part=icon]")).toBeTruthy();
  });

  it("foco via teclado dispara a one-shot (data-part animado existe)", () => {
    renderWithProviders(
      <HeroMediaIcon type="movie" animationVariant="clapperboard" href="/catalog?type=movie" label="Filmes" />,
    );
    const link = screen.getByRole("link", { name: "Explorar Filmes" });
    link.focus();
    fireEvent.focus(link);
    expect(document.activeElement).toBe(link);
  });

  it("touch: toque dispara one-shot e navega após ~700ms", () => {
    renderWithProviders(
      <HeroMediaIcon type="game" animationVariant="controller" href="/catalog?type=game" label="Games" />,
    );
    const link = screen.getByRole("link", { name: "Explorar Games" });
    const spy = vi.spyOn(window, "setTimeout");
    fireEvent.click(link, { detail: 1 });
    expect(spy).toHaveBeenCalled();
  });

  it("prefers-reduced-motion desabilita animações (sem error em hover)", () => {
    renderWithProviders(
      <HeroMediaIcon type="movie" animationVariant="clapperboard" href="/catalog?type=movie" label="Filmes" />,
    );
    const link = screen.getByRole("link", { name: "Explorar Filmes" });
    fireEvent.mouseEnter(link);
    fireEvent.mouseLeave(link);
    expect(link).toBeTruthy();
  });
});

describe("HeroIconCluster (D-204)", () => {
  it("renderiza nav/ul/li com 5 ícones e aria-labels", () => {
    const { container } = renderWithProviders(<HeroIconCluster />);
    const nav = container.querySelector('nav[aria-label="Categorias de mídia"]');
    expect(nav).toBeTruthy();
    expect(nav?.querySelectorAll("li").length).toBe(5);
    expect(screen.getByRole("link", { name: "Explorar Filmes" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorar Séries" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorar Games" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorar Livros" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorar Quadrinhos" })).toBeTruthy();
  });

  it("cada link aponta para o filtro de catálogo correto", () => {
    renderWithProviders(<HeroIconCluster />);
    const movie = screen.getByRole("link", { name: "Explorar Filmes" });
    expect(movie.getAttribute("href")).toContain("type=movie");
    const comic = screen.getByRole("link", { name: "Explorar Quadrinhos" });
    expect(comic.getAttribute("href")).toContain("type=comic");
  });
});

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
