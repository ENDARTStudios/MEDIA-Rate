import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Bar } from "@/components/Bar";

describe("Bar", () => {
  it("modo uma barra (só audiência) quando criticsScore null", () => {
    const { container } = render(<Bar criticsScore={null} audienceScore={75} />);
    expect(container.querySelector("[data-testid=bar-single]")).toBeTruthy();
    expect(container.textContent).toContain("Audiência");
    expect(container.textContent).toContain("75");
    expect(container.textContent).not.toContain("Críticos");
  });

  it("modo dual com críticos + audiência", () => {
    const { container } = render(<Bar criticsScore={82} audienceScore={75} />);
    expect(container.querySelector("[data-testid=bar-dual]")).toBeTruthy();
    expect(container.textContent).toContain("Críticos");
    expect(container.textContent).toContain("Audiência");
  });

  it("mensagem insuficiente quando ambos null", () => {
    const { container } = render(<Bar criticsScore={null} audienceScore={null} />);
    expect(container.textContent).toContain("Ainda sem avaliações");
  });

  it("borda tracejada quando consensus < 3 e criticsScore não null", () => {
    const { container } = render(<Bar criticsScore={82} audienceScore={45} consensus={2} />);
    expect(container.querySelector(".border-dashed")).toBeTruthy();
    expect(container.textContent).toContain("divergência");
  });

  it("NUNCA borda tracejada quando criticsScore null (filme/série)", () => {
    const { container } = render(<Bar criticsScore={null} audienceScore={75} consensus={2} />);
    expect(container.querySelector(".border-dashed")).toBeFalsy();
  });

  it("sem divergência quando consensus >= 3", () => {
    const { container } = render(<Bar criticsScore={82} audienceScore={80} consensus={4} />);
    expect(container.querySelector(".border-dashed")).toBeFalsy();
  });
});
