import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { Logo } from "@/components/Logo";
import { FONTES_ATIVAS, NUM_FONTES_ATIVAS } from "@/lib/sources";
import { MediaScoreModule } from "@/components/MediaScoreModule";
import { NextIntlClientProvider } from "next-intl";

function mockMatchMedia() {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
  // jsdom define getTotalLength como getter não-sobrescrevível — redefine via
  // defineProperty (configurable) para o anime do Logo não quebrar o teste.
  try {
    const proto = (globalThis as Record<string, unknown>).SVGPathElement as {
      prototype: object;
    } | undefined;
    if (proto?.prototype) {
      Object.defineProperty(proto.prototype, "getTotalLength", {
        configurable: true,
        value: () => 100,
      });
    }
  } catch {
    // ambiente sem SVG — irrelevante para o teste
  }
}

const messages = {
  catalog: {
    bayesNote: "Ajustado por volume de votos (estimador Bayesiano).",
    methodologyLink: "Ver metodologia",
    scoreAriaLabel: "Nota {score} de {scale}",
    sources: "Fontes",
    noReviews: "Sem avaliações",
    updated: "Atualizado {date}",
    today: "hoje",
    fewSources: "Poucas fontes",
    criticsBar: "Crítica",
    audienceBar: "Público",
    consensusLabel: "Consenso",
    highConsensus: "Alto consenso",
    lowConsensus: "Divergência",
    semCritica: "Sem crítica",
    semPublico: "Sem público",
  },
  metadados: {
    highConfidence: "Alta confiança",
    mediumConfidence: "Média confiança",
    lowConfidence: "Baixa confiança",
  },
};

describe("T191 — marca consistente (logo)", () => {
  // renderToStaticMarkup = markup SSR puro (sem efeitos client) — valida
  // exatamente a exigência de T191: texto idêntico no servidor e no cliente.
  it("variante full renderiza 'MEDIA Rate' (com espaço) no SSR", () => {
    const html = renderToStaticMarkup(<Logo variant="full" />);
    expect(html).toContain("MEDIA Rate");
    expect(html).not.toContain("MEDIARate");
  });

  it("variante inline renderiza 'MEDIA Rate' no SSR", () => {
    const html = renderToStaticMarkup(<Logo variant="inline" />);
    expect(html).toContain("MEDIA Rate");
    expect(html).not.toContain("MEDIARate");
  });

  it("aria-label da marca é sempre 'MEDIA Rate'", () => {
    const html = renderToStaticMarkup(<Logo variant="full" />);
    expect(html).toContain('aria-label="MEDIA Rate"');
  });
});

describe("T191 — fonte única de verdade (sources.ts)", () => {
  it("registry inclui Trakt.tv e fontes ativas", () => {
    const nomes = FONTES_ATIVAS.map((f) => f.nome);
    expect(nomes).toContain("Trakt.tv");
    expect(nomes).toContain("TMDB");
    expect(nomes.length).toBeGreaterThanOrEqual(10);
  });

  it("cada fonte tem tipo (critica|publico) e mídias cobertas", () => {
    for (const fonte of FONTES_ATIVAS) {
      expect(["critica", "publico"]).toContain(fonte.tipo);
      expect(fonte.midias.length).toBeGreaterThan(0);
    }
  });

  it("contador derivado é a soma do registry", () => {
    expect(NUM_FONTES_ATIVAS).toBe(FONTES_ATIVAS.length);
  });

  it("existe fonte de crítica no registry (metacritic/RT/igdb/opencritic)", () => {
    const criticas = FONTES_ATIVAS.filter((f) => f.tipo === "critica").map((f) => f.nome);
    expect(criticas.length).toBeGreaterThanOrEqual(2);
  });
});

describe("T191 — nota Bayesiana sempre visível", () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it("renderiza a nota mesmo sem divergência calculada", () => {
    const score = {
      score: 7.3,
      detalhes: [],
      sources: [],
      fontes: [],
      criticsScore: null,
      audienceScore: null,
      consenso: null,
      confidence: "medium" as const,
      updatedAt: new Date().toISOString(),
    };
    const { container } = render(
      <NextIntlClientProvider locale="pt-BR" messages={messages}>
        <MediaScoreModule score={score} mediaType="movie" />
      </NextIntlClientProvider>,
    );
    expect(container.textContent).toContain("Ajustado por volume de votos");
  });
});
