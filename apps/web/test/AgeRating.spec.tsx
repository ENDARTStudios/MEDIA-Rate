import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AgeRating } from "@/components/AgeRating";

describe("AgeRating", () => {
  it("renderiza quando rating presente", () => {
    const { getByTestId } = render(<AgeRating rating="14" type="movie" />);
    expect(getByTestId("age-rating").textContent).toContain("14");
  });

  it("usa classificação BR para locale pt-BR", () => {
    const { getByTestId } = render(<AgeRating type="movie" locale="pt-BR" />);
    expect(getByTestId("age-rating").textContent).toContain("14");
  });

  it("usa classificação US para locale en-US", () => {
    const { getByTestId } = render(<AgeRating type="movie" locale="en-US" />);
    expect(getByTestId("age-rating").textContent).toContain("PG-13");
  });

  it("usa ESRB para games no locale en-US", () => {
    const { getByTestId } = render(<AgeRating type="game" locale="en-US" />);
    expect(getByTestId("age-rating").textContent).toContain("ESRB: T");
  });

  it("retorna null se rating e default ausentes", () => {
    const { container } = render(<AgeRating type="tv" locale="zz" />);
    expect(container.querySelector("[data-testid=age-rating]")).toBeNull();
  });
});
