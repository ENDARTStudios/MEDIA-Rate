import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { AgeRatingBadge } from "@/components/media-rate-ui/AgeRatingBadge";
import { SeriatedScoreTree } from "@/components/media-rate-ui/SeriatedScoreTree";
import { GenreChipRow } from "@/components/media-rate-ui/GenreChipRow";
import { AwardsShowcase } from "@/components/media-rate-ui/AwardsShowcase";
import { FranchiseCarousel } from "@/components/media-rate-ui/FranchiseCarousel";
import { FranchiseOrderToggle } from "@/components/media-rate-ui/FranchiseOrderToggle";

const messages = {
  metadados: {
    classification: "Classificação",
    suggestedByPublisher: "Sugerida pela editora",
    mayVaryBySeason: "Pode variar por temporada",
    genres: "Gêneros",
    genrePrompt: 'Explorar "{genre}":',
    sameMedia: "Ver mais {genre} em {media}",
    allMedia: "Ver {genre} em todas as mídias",
    awards: "Prêmios",
    awardsNone: "Não informado",
    won: "Vencedor",
    nominated: "Indicado",
    moreAwards: "mais",
    seriatedScores: "Notas por unidade",
    noVotesYet: "Ainda sem votos suficientes",
    noUnits: "Sem {label}",
    unitNote: "Nota da fonte.",
    franchise: "Sequências",
    franchiseNone: "Não informado",
    youAreHere: "Você está aqui",
    orderRelease: "Ordem de lançamento",
    orderChronological: "Ordem cronológica",
    orderToggle: "Ordenação",
    seasonUnit: "Temporada",
    notInformed: "Não informado",
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("Metadados estruturados (Addendum 2)", () => {
  describe("AgeRatingBadge", () => {
    it("selo DJCTQ com a letra e cor por faixa", () => {
      const { container } = renderWithProviders(<AgeRatingBadge rating="16" />);
      expect(container.textContent).toContain("16");
      expect(container.querySelector("[data-testid=age-rating-badge]")).toBeTruthy();
    });

    it("origem sugerida (livro/HQ/mangá) rotula como sugestão da editora", () => {
      renderWithProviders(<AgeRatingBadge rating="18" source="sugerida" />);
      expect(screen.getByText(/sugerida pela editora/i)).toBeTruthy();
    });

    it("perSeason indica variação por temporada", () => {
      renderWithProviders(<AgeRatingBadge rating="14" perSeason />);
      expect(screen.getByText("Pode variar por temporada")).toBeTruthy();
    });
  });

  describe("SeriatedScoreTree", () => {
    it("nota da fonte exibida; unidade sem nota mostra estado honesto", () => {
      const { container } = renderWithProviders(
        <SeriatedScoreTree
          unitLabel="Temporada"
          units={[
            { label: "Temporada 1", score: 8.4 },
            { label: "Temporada 2", score: null },
          ]}
        />,
      );
      expect(container.querySelectorAll("[data-testid=seriated-score]").length).toBe(1);
      expect(container.textContent).toContain("8.4");
      expect(screen.getByText("Ainda sem votos suficientes")).toBeTruthy();
    });

    it("média das subunidades com nota quando a unidade não tem nota direta", () => {
      const { container } = renderWithProviders(
        <SeriatedScoreTree
          unitLabel="Temporada"
          units={[
            {
              label: "Temporada 1",
              score: null,
              subUnits: [
                { label: "Ep 1", score: 8 },
                { label: "Ep 2", score: 6 },
                { label: "Ep 3", score: null },
              ],
            },
          ]}
        />,
      );
      // média de 8 e 6 (Ep 3 sem nota fica fora) = 7.0 — exibida na unidade,
      // além das notas individuais dos episódios com avaliação.
      const scores = container.querySelectorAll("[data-testid=seriated-score]");
      expect(scores.length).toBe(3);
      expect(scores[0]?.textContent).toBe("7.0");
      expect(scores[1]?.textContent).toBe("8.0");
      expect(scores[2]?.textContent).toBe("6.0");
    });
  });

  describe("GenreChipRow", () => {
    it("separa gêneros compartilhados dos específicos da mídia", () => {
      renderWithProviders(
        <GenreChipRow
          sharedGenres={["Terror", "Drama"]}
          mediaSpecificGenres={["RPG", "Roguelike"]}
          mediaType="game"
        />,
      );
      expect(screen.getByText("Terror")).toBeTruthy();
      expect(screen.getByText("RPG")).toBeTruthy();
    });

    it("clique abre o prompt com as duas opções de filtro", () => {
      renderWithProviders(
        <GenreChipRow sharedGenres={["Terror"]} mediaSpecificGenres={[]} mediaType="movie" />,
      );
      fireEvent.click(screen.getByText("Terror"));
      const same = screen.getByText(/Ver mais Terror em/);
      expect(same.getAttribute("href")).toContain("/catalog?type=movie&genero=terror");
      expect(screen.getByText(/Ver Terror em todas as mídias/).getAttribute("href")).toContain(
        "/catalog?genero=terror",
      );
    });

    it("sem gêneros → estado explícito (Não informado)", () => {
      renderWithProviders(
        <GenreChipRow sharedGenres={[]} mediaSpecificGenres={[]} mediaType="book" />,
      );
      expect(screen.getByText("Não informado")).toBeTruthy();
    });
  });

  describe("AwardsShowcase", () => {
    it("vencedores primeiro, +X expansível para mais de 5", () => {
      const awards = Array.from({ length: 7 }, (_, i) => ({
        name: `Prêmio ${i}`,
        year: 2024,
        won: i === 0,
        organization: "Org",
      }));
      renderWithProviders(<AwardsShowcase awards={awards} />);
      expect(screen.getByText("Prêmio 0")).toBeTruthy();
      expect(screen.getByText(/\+2/)).toBeTruthy();
    });

    it("sem prêmios → 'Não informado' (nunca fabricado)", () => {
      renderWithProviders(<AwardsShowcase awards={[]} />);
      expect(screen.getByText("Não informado")).toBeTruthy();
    });
  });

  describe("FranchiseCarousel", () => {
    it("toggle cronológico só quando houver ordem cronológica", () => {
      renderWithProviders(
        <FranchiseCarousel
          items={[
            {
              midiaId: "m1",
              tipo: "movie",
              titulo: "Matrix",
              ano: 1999,
              posterUrl: null,
              score: null,
              ordemLancamento: 1,
              ordemCronologica: 1,
            },
            {
              midiaId: "m2",
              tipo: "movie",
              titulo: "Matrix 2",
              ano: 2003,
              posterUrl: null,
              score: null,
              ordemLancamento: 2,
              ordemCronologica: 2,
            },
          ]}
          currentMediaId="m1"
        />,
      );
      expect(screen.getByText("Ordem cronológica")).toBeTruthy();
      expect(screen.getByText("Você está aqui")).toBeTruthy();
    });

    it("sem ordem cronológica → sem toggle (só ordem de lançamento)", () => {
      renderWithProviders(
        <FranchiseCarousel
          items={[
            {
              midiaId: "m1",
              tipo: "movie",
              titulo: "A",
              ano: 2000,
              posterUrl: null,
              score: null,
              ordemLancamento: 1,
              ordemCronologica: null,
            },
          ]}
          currentMediaId="m1"
        />,
      );
      expect(screen.queryByText("Ordem cronológica")).toBeNull();
    });

    it("sem itens → 'Não informado'", () => {
      renderWithProviders(<FranchiseCarousel items={[]} currentMediaId="m1" />);
      expect(screen.getByText("Não informado")).toBeTruthy();
    });
  });

  describe("FranchiseOrderToggle", () => {
    it("alterna o critério", () => {
      const onChange = vi.fn();
      renderWithProviders(<FranchiseOrderToggle order="lancamento" onChange={onChange} />);
      fireEvent.click(screen.getByText("Ordem cronológica"));
      expect(onChange).toHaveBeenCalledWith("cronologica");
    });
  });
});
