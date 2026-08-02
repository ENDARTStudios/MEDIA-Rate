import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { MediaScoreModule } from "@/components/MediaScoreModule";
import type { MediaScore as MediaScoreType } from "@/lib/types";

const messages = {
  catalog: {
    scoreUnavailable: "MEDIA Score indisponível",
    scoreComingSoon: "Em breve — fontes em preparação",
    highConfidence: "Alta confiança",
    mediumConfidence: "Média confiança",
    lowConfidence: "Baixa confiança",
    fewSources: "Poucas fontes/avaliações",
    scoreAriaLabel: "Score geral {score} de 100, baseado em {sources} fontes",
    sources: "Fontes",
  },
};

const SCORE: MediaScoreType = {
  consolidated: 89,
  confidence: "high",
  sources: [{ source: "goodreads", score: 4.5, maxScore: 5 }],
  explanation: "Baseado em avaliações de leitores.",
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("MediaScoreModule — P2 tipos em preparação", () => {
  it("livro (preparação) mostra badge 'Em breve'", () => {
    const { getByTestId, getByText } = renderWithProviders(
      <MediaScoreModule score={SCORE} mediaType="book" />,
    );
    expect(getByTestId("score-coming-soon")).toBeTruthy();
    expect(getByText("Em breve — fontes em preparação")).toBeTruthy();
  });

  it("HQ (preparação) também mostra o badge", () => {
    const { queryByTestId } = renderWithProviders(
      <MediaScoreModule score={SCORE} mediaType="comic" />,
    );
    expect(queryByTestId("score-coming-soon")).toBeTruthy();
  });

  it("filme NÃO mostra o badge", () => {
    const { queryByTestId } = renderWithProviders(
      <MediaScoreModule score={SCORE} mediaType="movie" />,
    );
    expect(queryByTestId("score-coming-soon")).toBeNull();
  });

  it("sem score mostra estado vazio sem badge", () => {
    const { queryByTestId, getByTestId } = renderWithProviders(
      <MediaScoreModule score={null} mediaType="book" />,
    );
    expect(getByTestId("score-empty")).toBeTruthy();
    expect(queryByTestId("score-coming-soon")).toBeNull();
  });
});
