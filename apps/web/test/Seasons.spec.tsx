import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { Seasons } from "@/components/Seasons";

const messages = {
  catalog: {
    seasons: "Temporadas",
    seasonLabel: "Temporada",
    episodes: "Episódios",
    episodesSeason: "Episódios — Temporada {season}",
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const mockSeasons = [
  { number: 1, title: "Primeira", episodeCount: 10, score: 82 },
  { number: 2, title: "Segunda", episodeCount: 12 },
  { number: 3, title: "Terceira", episodeCount: 8, score: 79 },
];

describe("Seasons", () => {
  it("renderiza tabs para N seasons", () => {
    const { getByTestId, getByText } = renderWithProviders(<Seasons seasons={mockSeasons} />);
    expect(getByTestId("seasons")).toBeTruthy();
    expect(getByText("Primeira")).toBeTruthy();
    expect(getByText("Segunda")).toBeTruthy();
  });

  it("destaca season ativa", () => {
    const { getByRole } = renderWithProviders(<Seasons seasons={mockSeasons} activeSeason={2} />);
    const tab = getByRole("tab", { selected: true });
    expect(tab).toBeTruthy();
    expect(tab.textContent).toContain("Segunda");
  });

  it("chama onSelect ao clicar", async () => {
    const onSelect = vi.fn();
    const { getByText } = renderWithProviders(
      <Seasons seasons={mockSeasons} onSelect={onSelect} />,
    );
    const btn = getByText("Terceira");
    await userEvent.setup().click(btn);
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("renderiza Badge quando score disponivel", () => {
    const { getByText } = renderWithProviders(<Seasons seasons={[mockSeasons[0]]} />);
    expect(getByText("82")).toBeTruthy();
  });

  it("retorna null quando vazio", () => {
    const { container } = renderWithProviders(<Seasons seasons={[]} />);
    expect(container.querySelector("[data-testid=seasons]")).toBeNull();
  });
});
