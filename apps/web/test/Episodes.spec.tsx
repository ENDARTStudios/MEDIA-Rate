import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Episodes } from "@/components/Episodes";

const mockEpisodes = [
  { number: 1, title: "Piloto", synopsis: "O começo.", score: 78, runtime: "42min" },
  { number: 2, title: "O Despertar", runtime: "45min" },
];

describe("Episodes", () => {
  it("renderiza lista de episódios", () => {
    const { getByTestId, getByText } = render(<Episodes episodes={mockEpisodes} seasonNumber={1} />);
    expect(getByTestId("episodes")).toBeTruthy();
    expect(getByText("Piloto")).toBeTruthy();
  });

  it("expandir mostra sinopse e score", async () => {
    const { getByText } = render(<Episodes episodes={[mockEpisodes[0]!]} seasonNumber={1} />);
    await userEvent.setup().click(getByText("Piloto"));
    expect(getByText("O começo.")).toBeTruthy();
    expect(getByText("78")).toBeTruthy();
  });

  it("exibe runtime", () => {
    const { getByText } = render(<Episodes episodes={mockEpisodes} seasonNumber={1} />);
    expect(getByText("42min")).toBeTruthy();
  });

  it("retorna null quando vazio", () => {
    const { container } = render(<Episodes episodes={[]} seasonNumber={1} />);
    expect(container.querySelector("[data-testid=episodes]")).toBeNull();
  });
});
