import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AgeRating } from "@/components/AgeRating";

describe("AgeRating", () => {
  it("renderiza quando rating presente", () => {
    const { getByTestId } = render(<AgeRating rating="14" type="movie" />);
    expect(getByTestId("age-rating").textContent).toContain("14");
  });

  it("renderiza rating ESRB quando fornecido", () => {
    const { getByTestId } = render(<AgeRating rating="ESRB: T" type="game" locale="en-US" />);
    expect(getByTestId("age-rating").textContent).toContain("ESRB: T");
  });

  it("retorna null quando rating nao fornecido", () => {
    const { container } = render(<AgeRating type="movie" locale="pt-BR" />);
    expect(container.querySelector("[data-testid=age-rating]")).toBeNull();
  });

  it("retorna null quando rating eh string vazia", () => {
    const { container } = render(<AgeRating rating="" type="movie" />);
    expect(container.querySelector("[data-testid=age-rating]")).toBeNull();
  });

  it("retorna null para tipo desconhecido sem rating", () => {
    const { container } = render(<AgeRating type="tv" locale="zz" />);
    expect(container.querySelector("[data-testid=age-rating]")).toBeNull();
  });
});
