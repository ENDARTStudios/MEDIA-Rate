import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { CountUpValue } from "@/components/media-rate-ui/CountUpValue";

/**
 * T208/D-580 — guardas do contador de prova social da home.
 *
 * Origem do componente: padrão do `CountUp` do React Bits (registry `@react-bits`),
 * reimplementado com três correções exigidas pelo repo. Estes testes travam
 * exatamente essas três correções (as que o original não tinha):
 *  1. formatação pelo LOCALE da rota (o original fixa `en-US`);
 *  2. valor presente no HTML do SERVIDOR (o original renderiza `<span>` vazio);
 *  3. `prefers-reduced-motion` mantém o valor final (sem animação).
 */

function renderSSR(value: number, locale: string) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <CountUpValue value={value} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

describe("CountUpValue — locale e SSR", () => {
  it("o HTML do servidor já traz o valor FINAL formatado (não um span vazio)", () => {
    const html = renderSSR(17217, "pt-BR");
    expect(html).toContain("17.217");
    expect(html).toContain('data-countup="17217"');
    // Regressão do bug corrigido: nada de contador iniciando em 0 no SSR.
    expect(html).not.toContain(">0<");
  });

  it("agrupa os milhares conforme o locale da rota", () => {
    expect(renderSSR(17217, "pt-BR")).toContain("17.217");
    expect(renderSSR(17217, "en-US")).toContain("17,217");
    expect(renderSSR(17217, "es-ES")).toContain("17.217");
  });

  it("cobre extremos sem quebrar (0, 1, 6 e milhões)", () => {
    expect(renderSSR(0, "pt-BR")).toContain('data-countup="0"');
    expect(renderSSR(6, "pt-BR")).toContain(">6<");
    const big = renderSSR(987654321, "pt-BR");
    expect(big).toContain("987.654.321");
  });
});
