import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { Episodes } from "@/components/Episodes";

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

const mockEpisodes = [
  { number: 1, title: "Piloto", synopsis: "O começo.", score: 78, runtime: "42min" },
  { number: 2, title: "O Despertar", runtime: "45min" },
];

describe("Episodes", () => {
  it("renderiza lista de episódios", () => {
    const { getByTestId, getByText } = renderWithProviders(
      <Episodes episodes={mockEpisodes} seasonNumber={1} />,
    );
    expect(getByTestId("episodes")).toBeTruthy();
    expect(getByText("Piloto")).toBeTruthy();
  });

  it("expandir mostra sinopse e score", async () => {
    const { getByText } = renderWithProviders(
      <Episodes episodes={[mockEpisodes[0]]} seasonNumber={1} />,
    );
    await userEvent.setup().click(getByText("Piloto"));
    expect(getByText("O começo.")).toBeTruthy();
    expect(getByText("78")).toBeTruthy();
  });

  it("exibe runtime", () => {
    const { getByText } = renderWithProviders(
      <Episodes episodes={mockEpisodes} seasonNumber={1} />,
    );
    expect(getByText("42min")).toBeTruthy();
  });

  it("retorna null quando vazio", () => {
    const { container } = renderWithProviders(<Episodes episodes={[]} seasonNumber={1} />);
    expect(container.querySelector("[data-testid=episodes]")).toBeNull();
  });
});
