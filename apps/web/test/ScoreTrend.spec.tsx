import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ScoreTrend } from "@/components/ScoreTrend";

/**
 * T147/B5: ScoreTrend usa useLocale (formatação do delta por locale — pt-BR
 * vírgula). O provider é necessário como em produção.
 */
function renderTrend(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ScoreTrend", () => {
  it("soma seta para cima com delta positivo", () => {
    const { getByTestId } = renderTrend(
      <ScoreTrend
        snapshots={[
          { date: "a", score: 7.5 },
          { date: "b", score: 8.2 },
        ]}
      />,
    );
    const el = getByTestId("score-trend");
    expect(el.textContent).toContain("\u2191");
    expect(el.textContent).toContain("+0,7");
  });

  it("seta para baixo com delta negativo", () => {
    const { getByTestId } = renderTrend(
      <ScoreTrend
        snapshots={[
          { date: "a", score: 9.0 },
          { date: "b", score: 8.5 },
        ]}
      />,
    );
    const el = getByTestId("score-trend");
    expect(el.textContent).toContain("\u2193");
    expect(el.textContent).toContain("-0,5");
  });

  it("seta horizontal quando estável", () => {
    const { getByTestId } = renderTrend(
      <ScoreTrend
        snapshots={[
          { date: "a", score: 7.0 },
          { date: "b", score: 7.0 },
        ]}
      />,
    );
    const el = getByTestId("score-trend");
    expect(el.textContent).toContain("\u2192");
    expect(el.textContent).toContain("0");
  });

  it("retorna null com menos de 2 snapshots", () => {
    const { container } = renderTrend(<ScoreTrend snapshots={[{ date: "a", score: 7.0 }]} />);
    expect(container.querySelector("[data-testid=score-trend]")).toBeNull();
  });
});
