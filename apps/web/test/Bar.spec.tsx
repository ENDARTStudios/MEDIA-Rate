import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Bar } from "@/components/Bar";

const messages = {
  catalog: {
    criticsBar: "Crítica",
    semCritica: "Sem crítica",
    audienceBar: "Público",
    semPublico: "Sem público",
    consensusLabel: "Consenso",
    highConsensus: "Alto consenso",
    lowConsensus: "Divergência crítica/público",
    noRatingsYet: "Ainda sem avaliações suficientes",
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("Bar", () => {
  it("modo dual: barras Crítica e Público com escala 0–100 (CRIT-02)", () => {
    const { container } = renderWithProviders(<Bar criticsScore={89} audienceScore={81.5} />);
    expect(container.querySelector("[data-testid=bar-dual]")).toBeTruthy();
    expect(container.textContent).toContain("Crítica");
    expect(container.textContent).toContain("Público");
    expect(container.textContent).toContain("89");
    expect(container.textContent).toContain("81.5");
    const bars = container.querySelectorAll(".h-2 > div");
    expect(bars[0]).toHaveStyle({ width: "89%" });
    expect(bars[1]).toHaveStyle({ width: "82%" });
  });

  it("só audiência quando criticsScore null — mostra 'Sem crítica' explícito", () => {
    const { container } = renderWithProviders(<Bar criticsScore={null} audienceScore={75} />);
    expect(container.querySelector("[data-testid=bar-dual]")).toBeTruthy();
    expect(container.textContent).toContain("Crítica");
    expect(container.querySelector("[data-testid=sem-critica]")).toBeTruthy();
    expect(container.textContent).toContain("Sem crítica");
    expect(container.textContent).toContain("Público");
  });

  it("mensagem insuficiente quando ambos null", () => {
    const { container } = renderWithProviders(<Bar criticsScore={null} audienceScore={null} />);
    expect(container.textContent).toContain("Ainda sem avaliações");
  });

  it("consenso alto quando gap ≤ 10 pontos (escala 0–100)", () => {
    const { container } = renderWithProviders(<Bar criticsScore={89} audienceScore={81.5} />);
    expect(container.textContent).toContain("Alto consenso");
  });

  it("divergência quando gap > 10 pontos", () => {
    const { container } = renderWithProviders(<Bar criticsScore={90} audienceScore={50} />);
    expect(container.textContent).toContain("Divergência crítica/público");
    expect(container.textContent).toContain("40.0pts");
  });
});
