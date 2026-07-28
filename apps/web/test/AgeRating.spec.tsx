import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AgeRating } from "@/components/AgeRating";

describe("AgeRating", () => {
  it("renderiza quando rating presente", () => {
    const { getByTestId } = render(<AgeRating rating="14" type="movie" />);
    expect(getByTestId("age-rating").textContent).toContain("14");
  });

  it("prefixa ESRB para type game", () => {
    const { getByTestId } = render(<AgeRating rating="T" type="game" />);
    expect(getByTestId("age-rating").textContent).toContain("ESRB: T");
  });

  it("retorna null quando rating ausente", () => {
    const { container } = render(<AgeRating rating={undefined} type="movie" />);
    expect(container.querySelector("[data-testid=age-rating]")).toBeNull();
  });

  it("retorna null com string vazia", () => {
    const { container } = render(<AgeRating rating="" type="tv" />);
    expect(container.querySelector("[data-testid=age-rating]")).toBeNull();
  });
});
