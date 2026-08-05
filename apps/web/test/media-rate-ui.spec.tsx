import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { CriticsVsAudienceBar } from "@/components/media-rate-ui/CriticsVsAudienceBar";
import { CategoryChip } from "@/components/media-rate-ui/CategoryChip";
import { ConfidenceBadge } from "@/components/media-rate-ui/ConfidenceBadge";
import { SourceMiniCard } from "@/components/media-rate-ui/SourceMiniCard";
import { EmptyStateComingSoon } from "@/components/media-rate-ui/EmptyStateComingSoon";
import { ScoreDial } from "@/components/media-rate-ui/ScoreDial";

const messages = {
  catalog: {
    criticsBar: "Crítica",
    audienceBar: "Público",
    consensusLabel: "Consenso",
    consensusTooltip: "Consenso = proximidade entre crítica e público.",
    highConsensus: "Alto consenso",
    lowConsensus: "Divergência crítica/público",
    noRatingsYet: "Ainda sem avaliações suficientes",
    highConfidence: "Alta confiança",
    mediumConfidence: "Média confiança",
    lowConfidence: "Baixa confiança",
    sources: "Fontes",
    filme: "Filmes",
    serie: "Séries",
    game: "Games",
    livro: "Livros",
    comic: "Quadrinhos",
    anime: "Animes",
    noResults: "Em breve",
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("media-rate-ui — biblioteca de componentes (Parte 4)", () => {
  describe("CriticsVsAudienceBar", () => {
    it("barras Crítica/Público com escala 0–100 e consenso alto", () => {
      const { container } = renderWithProviders(
        <CriticsVsAudienceBar critics={89} audience={81.5} />,
      );
      expect(container.querySelector("[data-testid=critics-audience-bar]")).toBeTruthy();
      expect(container.textContent).toContain("Crítica");
      expect(container.textContent).toContain("Público");
      expect(container.textContent).toContain("Alto consenso");
      const fills = container.querySelectorAll(".h-2 > div");
      expect(fills[0]).toHaveStyle({ width: "89%" });
      expect(fills[1]).toHaveStyle({ width: "82%" });
    });

    it("divergência quando gap > 10 pontos", () => {
      const { container } = renderWithProviders(
        <CriticsVsAudienceBar critics={90} audience={50} />,
      );
      expect(container.textContent).toContain("Divergência crítica/público");
      expect(container.textContent).toContain("40.0pts");
    });

    it("escala 0-10 normaliza internamente", () => {
      const { container } = renderWithProviders(
        <CriticsVsAudienceBar critics={8.9} audience={8.2} scale="0-10" />,
      );
      const fills = container.querySelectorAll(".h-2 > div");
      expect(fills[0]).toHaveStyle({ width: "89%" });
    });

    it("mensagem de insuficiência quando ambos null", () => {
      renderWithProviders(<CriticsVsAudienceBar critics={null} audience={null} />);
      expect(screen.getByText("Ainda sem avaliações suficientes")).toBeTruthy();
    });
  });

  describe("CategoryChip", () => {
    it("renderiza ícone + label + contagem com accent da mídia", () => {
      renderWithProviders(<CategoryChip type="game" count={196} label="Games" />);
      const chip = screen.getByTestId("category-chip-game");
      expect(chip.textContent).toContain("Games");
      expect(chip.textContent).toContain("196");
    });

    it("estado ativo: aria-pressed e fundo no accent", () => {
      renderWithProviders(<CategoryChip type="movie" active label="Filmes" />);
      const chip = screen.getByTestId("category-chip-movie");
      expect(chip.getAttribute("aria-pressed")).toBe("true");
      expect(chip.style.backgroundColor).toBe("rgb(129, 140, 248)"); // #818CF8
    });

    it("clique dispara onClick", () => {
      const onClick = vi.fn();
      renderWithProviders(<CategoryChip type="series" onClick={onClick} label="Séries" />);
      fireEvent.click(screen.getByTestId("category-chip-series"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("ConfidenceBadge", () => {
    it.each([
      ["high", "Alta confiança"],
      ["medium", "Média confiança"],
      ["low", "Baixa confiança"],
    ] as const)("confiança %s → label %s", (confidence, label) => {
      renderWithProviders(<ConfidenceBadge confidence={confidence} />);
      expect(screen.getByTestId(`confidence-badge-${confidence}`).textContent).toContain(label);
    });

    it("aria-label inclui tooltip quando fornecido", () => {
      renderWithProviders(<ConfidenceBadge confidence="low" tooltip="Poucas fontes/avaliações" />);
      const badge = screen.getByTestId("confidence-badge-low");
      expect(badge.getAttribute("aria-label")).toContain("Poucas fontes/avaliações");
    });
  });

  describe("SourceMiniCard", () => {
    it("mostra nome, nota original e normalizada", () => {
      renderWithProviders(
        <SourceMiniCard
          name="TMDB"
          ratingOriginal={8.5}
          ratingNormalized={85}
          classification="publico"
        />,
      );
      const card = screen.getByTestId("source-mini-card-tmdb");
      expect(card.textContent).toContain("TMDB");
      expect(card.textContent).toContain("85/100");
      expect(card.textContent).toContain("8.5");
      expect(card.textContent).toContain("Público");
    });

    it("é link quando url fornecida", () => {
      renderWithProviders(
        <SourceMiniCard
          name="IGDB"
          ratingOriginal={92}
          ratingNormalized={92}
          url="https://igdb.com"
        />,
      );
      const link = screen.getByRole("link", { name: /IGDB/ });
      expect(link.getAttribute("href")).toBe("https://igdb.com");
      expect(link.getAttribute("target")).toBe("_blank");
    });
  });

  describe("EmptyStateComingSoon", () => {
    it("estado vazio com ícone da categoria e texto", () => {
      renderWithProviders(<EmptyStateComingSoon type="book" />);
      const el = screen.getByTestId("coming-soon-book");
      expect(el.textContent).toContain("Livros");
      expect(el.textContent).toContain("Em breve");
    });

    it("form de waitlist chama onNotify e mostra confirmação", async () => {
      const onNotify = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(<EmptyStateComingSoon type="comic" onNotify={onNotify} />);
      const input = screen.getByLabelText("E-mail");
      fireEvent.change(input, { target: { value: "eu@exemplo.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Avisar-me" }));
      expect(onNotify).toHaveBeenCalledWith("eu@exemplo.com");
      expect(await screen.findByText(/Cadastrado!/)).toBeTruthy();
    });

    it("sem onNotify, não renderiza form", () => {
      renderWithProviders(<EmptyStateComingSoon type="anime" />);
      expect(screen.queryByTestId("coming-soon-form")).toBeNull();
    });
  });

  describe("ScoreDial (Parte 4 D-203)", () => {
    it("renderiza valor com aria-label incluindo escala", () => {
      renderWithProviders(<ScoreDial value={8.4} scale="0-10" size="md" />);
      expect(screen.getByRole("img", { name: /8,4 de 10/ })).toBeTruthy();
      expect(screen.getByTestId("score-dial-md")).toBeTruthy();
    });

    it("escala 0-100 usa max 100 no aria-label", () => {
      renderWithProviders(<ScoreDial value={90.4} scale="0-100" size="sm" />);
      expect(screen.getByRole("img", { name: /90,4 de 100/ })).toBeTruthy();
    });

    it("faixa alta (≥8) usa verde #34D399", () => {
      const { container } = renderWithProviders(<ScoreDial value={8.2} scale="0-10" />);
      const stroke = container.querySelector("[data-testid=score-dial-md] circle:nth-of-type(2)");
      expect(stroke?.getAttribute("stroke")).toBe("#34D399");
    });

    it("faixa média (≥6) usa âmbar #FBBF24", () => {
      const { container } = renderWithProviders(<ScoreDial value={6.5} scale="0-10" />);
      const stroke = container.querySelector("[data-testid=score-dial-md] circle:nth-of-type(2)");
      expect(stroke?.getAttribute("stroke")).toBe("#FBBF24");
    });

    it("faixa baixa (<6) usa vermelho #F87171", () => {
      const { container } = renderWithProviders(<ScoreDial value={4.2} scale="0-10" />);
      const stroke = container.querySelector("[data-testid=score-dial-md] circle:nth-of-type(2)");
      expect(stroke?.getAttribute("stroke")).toBe("#F87171");
    });

    it("limiares relativos à escala 0-100 (≥80 alto, ≥60 médio)", () => {
      const { container: alto } = renderWithProviders(<ScoreDial value={85} scale="0-100" />);
      const strokeAlto = alto.querySelector("[data-testid=score-dial-md] circle:nth-of-type(2)");
      expect(strokeAlto?.getAttribute("stroke")).toBe("#34D399");
      const { container: medio } = renderWithProviders(<ScoreDial value={62} scale="0-100" />);
      const strokeMedio = medio.querySelector("[data-testid=score-dial-md] circle:nth-of-type(2)");
      expect(strokeMedio?.getAttribute("stroke")).toBe("#FBBF24");
    });

    it("não estoura em valores fora da escala (clamp)", () => {
      renderWithProviders(<ScoreDial value={120} scale="0-100" />);
      expect(screen.getByRole("img", { name: /100 de 100/ })).toBeTruthy();
    });
  });

  describe("CategoryChip (Parte 4 D-203)", () => {
    it("estado ativo usa accent da categoria no fundo", () => {
      renderWithProviders(<CategoryChip type="movie" active />);
      const chip = screen.getByTestId("category-chip-movie");
      expect(chip.getAttribute("aria-pressed")).toBe("true");
      expect(chip.style.backgroundColor).toBe("rgb(129, 140, 248)");
    });

    it("contagem compacta para valores grandes (1.2k)", () => {
      renderWithProviders(<CategoryChip type="game" count={1200} />);
      expect(screen.getByText("1,2k")).toBeTruthy();
    });

    it("contagem simples para valores pequenos", () => {
      renderWithProviders(<CategoryChip type="series" count={194} />);
      expect(screen.getByText("194")).toBeTruthy();
    });
  });

  describe("CriticsVsAudienceBar (Parte 4 D-203)", () => {
    it("tooltip de consenso presente no selo", () => {
      renderWithProviders(
        <CriticsVsAudienceBar critics={90} audience={85} scale="0-100" />,
      );
      const selo = screen.getByText("Alto consenso");
      expect(selo.getAttribute("title")).toContain("Consenso");
    });

    it("gradiente de consenso renderizado quando ambos os lados existem", () => {
      const { container } = renderWithProviders(
        <CriticsVsAudienceBar critics={90} audience={85} scale="0-100" />,
      );
      const gradiente = container.querySelector("[data-testid=consensus-gradient]");
      expect(gradiente).toBeTruthy();
      expect(gradiente?.getAttribute("style")).toContain("38BDF8");
    });
  });
});
