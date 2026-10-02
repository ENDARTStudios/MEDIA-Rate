import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { escalaPorTipo, exibirScore, formatarScoreLocale } from "@/lib/score-utils";
import { ScoreDial } from "@/components/media-rate-ui/ScoreDial";
import { StaticScoreDial } from "@/components/media-rate-ui/StaticScoreDial";
import { ScoreDial as UiScoreDial } from "@/components/ui/score-dial";
import { MediaScoreBadge } from "@/components/MediaScoreBadge";
import { MediaScoreModule } from "@/components/MediaScoreModule";
import { MediaCardShell } from "@/components/media-rate-ui/MediaCardShell";
import type { MediaScore as MediaScoreType } from "@/lib/types";
import type { MediaItem } from "@/components/MediaCard";

/**
 * T147 (UG-09/B2-B5) — pipeline único de exibição de notas.
 *
 * Regras (BETA-GAP-09 + devolutiva do Operador):
 * - games 0-100; mangá 0-10; demais 0-10 — NUNCA mangá como 0-100 (B2).
 * - Nenhuma nota decimal arredondada na exibição final: 7,9 permanece 7,9;
 *   7,95 trunca para 7,9 (B3/B4).
 * - Animação e reduced-motion convergem para o MESMO valor formatado (B3).
 * - Separador decimal por locale: pt-BR vírgula; en-US ponto (B5).
 * - aria-labels refletem a escala real ("7,9 de 10" para mangá, nunca "de 100").
 */

/* ------------------------------------------------------------------ */
/* Catálogos de mensagem mínimos (mesmos namespaces da produção)       */
/* ------------------------------------------------------------------ */

const ptMessages = {
  scoredial: {
    ariaLabel: "Score: {score} de {max}",
    critic: "Crítica",
    audience: "Público",
    consensus: "Consenso",
  },
  catalog: {
    mediaScoreAria: "MEDIA Score {score} de 100",
    mediaScoreAria10: "MEDIA Score {score} de 10",
    scoreUnavailable: "MEDIA Score indisponível",
    scoreComingSoon: "Em breve — fontes em preparação",
    highConfidence: "Alta confiança",
    mediumConfidence: "Média confiança",
    lowConfidence: "Baixa confiança",
    fewSources: "Poucas fontes/avaliações",
    scoreAriaLabel: "Score geral {score} de {scale}, baseado em {sources} fontes",
    sources: "Fontes",
  },
};

const enMessages = {
  scoredial: {
    ariaLabel: "Score: {score} out of {max}",
    critic: "Critics",
    audience: "Audience",
    consensus: "Consensus",
  },
};

function providers(ui: React.ReactElement, opts: { locale?: string; messages?: unknown } = {}) {
  return render(
    <NextIntlClientProvider
      locale={opts.locale ?? "pt-BR"}
      messages={(opts.messages ?? ptMessages) as never}
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

/** IntersectionObserver stub que dispara interseção após microtask
 * (o callback do componente referencia `io`/`observer` pós-construção). */
function stubIntersectionObserver() {
  class IO {
    constructor(cb: IntersectionObserverCallback) {
      queueMicrotask(() =>
        cb(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        ),
      );
    }
    observe = () => undefined;
    disconnect = () => undefined;
    unobserve = () => undefined;
    takeRecords = () => [];
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  vi.stubGlobal("IntersectionObserver", IO);
}

/** matchMedia com prefers-reduced-motion controlável (badge usa direto). */
function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  }));
}

/* ------------------------------------------------------------------ */
/* A. Helper central (score-utils) — pipeline único                    */
/* ------------------------------------------------------------------ */

describe("escalaPorTipo (B2: mangá NUNCA 0-100)", () => {
  it("mangá usa 0-10", () => {
    expect(escalaPorTipo("manga")).toBe("0-10");
  });
  it("game usa 0-100", () => {
    expect(escalaPorTipo("game")).toBe("0-100");
  });
  it("demais tipos e indefinido usam 0-10", () => {
    expect(escalaPorTipo("movie")).toBe("0-10");
    expect(escalaPorTipo("series")).toBe("0-10");
    expect(escalaPorTipo(undefined)).toBe("0-10");
  });
});

describe("exibirScore (pipeline único: normaliza, trunca, formata)", () => {
  it("mangá cru 0-100 (79) vira 7,9 na escala 0-10 com percent 79", () => {
    const d = exibirScore(79, "manga", "pt-BR");
    expect(d.value).toBe(7.9);
    expect(d.max).toBe(10);
    expect(d.percent).toBeCloseTo(79);
    expect(d.formatted).toBe("7,9");
  });

  it("mangá já 0-10 (7.9) permanece 7,9", () => {
    const d = exibirScore(7.9, "manga", "pt-BR");
    expect(d.value).toBe(7.9);
    expect(d.formatted).toBe("7,9");
  });

  it("7.95 trunca para 7,9 (NUNCA arredonda para 8)", () => {
    const d = exibirScore(7.95, "movie", "pt-BR");
    expect(d.value).toBe(7.9);
    expect(d.formatted).toBe("7,9");
  });

  it("game 79,2 permanece 79,2 com percent 79,2 (não arredonda p/ 79)", () => {
    const d = exibirScore(79.2, "game", "pt-BR");
    expect(d.value).toBe(79.2);
    expect(d.max).toBe(100);
    expect(d.percent).toBeCloseTo(79.2);
    expect(d.formatted).toBe("79,2");
  });

  it("game inteiro 79 exibe 79 sem decimal forçado", () => {
    expect(exibirScore(79, "game", "pt-BR").formatted).toBe("79");
  });

  it("separador decimal por locale (B5): pt-BR vírgula, en-US ponto", () => {
    expect(exibirScore(7.9, "movie", "pt-BR").formatted).toBe("7,9");
    expect(exibirScore(7.9, "movie", "en-US").formatted).toBe("7.9");
    expect(formatarScoreLocale(79.2, "en-US")).toBe("79.2");
    expect(formatarScoreLocale(8, "pt-BR")).toBe("8");
  });
});

/* ------------------------------------------------------------------ */
/* B. ScoreDial (media-rate-ui) — B3: sem arredondamento, aria i18n    */
/* ------------------------------------------------------------------ */

describe("ScoreDial (media-rate-ui)", () => {
  it("aria-label via i18n scoredial.ariaLabel com valor formatado", () => {
    providers(<ScoreDial value={8.4} scale="0-10" size="md" />);
    expect(screen.getByRole("img", { name: "Score: 8,4 de 10" })).toBeTruthy();
  });

  it("aria-label respeita locale en-US (B5)", () => {
    providers(<ScoreDial value={8.4} scale="0-10" size="md" />, {
      locale: "en-US",
      messages: enMessages,
    });
    expect(screen.getByRole("img", { name: "Score: 8.4 out of 10" })).toBeTruthy();
  });

  it("escala 0-100: aria com max 100 e valor decimal não arredondado", () => {
    providers(<ScoreDial value={79.2} scale="0-100" size="sm" />);
    expect(screen.getByRole("img", { name: "Score: 79,2 de 100" })).toBeTruthy();
  });

  it("B3: após a animação o valor final é 7,9 (não 8) e igual ao reduced-motion", async () => {
    stubIntersectionObserver();
    stubReducedMotion(false);
    providers(<ScoreDial value={7.9} scale="0-10" size="md" />);
    await vi.waitFor(
      () => {
        const dial = screen.getByRole("img", { name: "Score: 7,9 de 10" });
        expect(dial.textContent).toContain("7,9");
        expect(dial.textContent).not.toContain("8");
      },
      { timeout: 4000, interval: 100 },
    );
    vi.unstubAllGlobals();
  });
});

/* ------------------------------------------------------------------ */
/* C. StaticScoreDial — mesmo pipeline, sem animação                   */
/* ------------------------------------------------------------------ */

describe("StaticScoreDial", () => {
  it("mangá 7,9 escala 0-10: número formatado e aria i18n (não 'Nota', nunca 'de 100')", () => {
    providers(<StaticScoreDial value={7.9} scale="0-10" size="md" />);
    const dial = screen.getByRole("img", { name: "Score: 7,9 de 10" });
    expect(dial.textContent).toContain("7,9");
  });

  it("locale en-US: 7.9 out of 10", () => {
    providers(<StaticScoreDial value={7.9} scale="0-10" size="md" />, {
      locale: "en-US",
      messages: enMessages,
    });
    expect(screen.getByRole("img", { name: "Score: 7.9 out of 10" })).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* D. ui/score-dial — game decimal não arredonda                       */
/* ------------------------------------------------------------------ */

describe("ui ScoreDial (variante de settings)", () => {
  it("game 79,2 exibe 79,2 (não 79) e aria '79,2 de 100'", () => {
    stubIntersectionObserver();
    providers(<UiScoreDial score={79.2} scale="0-100" size="sm" />);
    const dial = screen.getByRole("status", { name: "Score: 79,2 de 100" });
    expect(dial.textContent).toContain("79,2");
    vi.unstubAllGlobals();
  });

  it("0-10: 7,9 permanece 7,9", () => {
    stubIntersectionObserver();
    providers(<UiScoreDial score={7.9} scale="0-10" size="sm" />);
    expect(screen.getByRole("status", { name: "Score: 7,9 de 10" }).textContent).toContain("7,9");
    vi.unstubAllGlobals();
  });
});

/* ------------------------------------------------------------------ */
/* E. MediaScoreBadge — B4: normaliza antes de exibir/colorir          */
/* ------------------------------------------------------------------ */

describe("MediaScoreBadge (B4)", () => {
  it("filme cru 0-100 (79) exibe 7,9 com aria 'de 10'", async () => {
    stubIntersectionObserver();
    stubReducedMotion(true);
    providers(<MediaScoreBadge score={79} mediaType="movie" />);
    await vi.waitFor(
      () => {
        const badge = screen.getByRole("status", { name: "MEDIA Score 7,9 de 10" });
        expect(badge.textContent).toContain("7,9");
      },
      { timeout: 4000, interval: 100 },
    );
    vi.unstubAllGlobals();
  });

  it("game cru 0-100 (84) permanece 84 com aria 'de 100'", async () => {
    stubIntersectionObserver();
    stubReducedMotion(true);
    providers(<MediaScoreBadge score={84} mediaType="game" />);
    await vi.waitFor(
      () => {
        const badge = screen.getByRole("status", { name: "MEDIA Score 84 de 100" });
        expect(badge.textContent).toContain("84");
      },
      { timeout: 4000, interval: 100 },
    );
    vi.unstubAllGlobals();
  });

  it("mangá cru 0-100 (79) exibe 7,9 com aria 'de 10' (B2)", async () => {
    stubIntersectionObserver();
    stubReducedMotion(true);
    providers(<MediaScoreBadge score={79} mediaType="manga" />);
    await vi.waitFor(
      () => {
        expect(screen.getByRole("status", { name: "MEDIA Score 7,9 de 10" })).toBeTruthy();
      },
      { timeout: 4000, interval: 100 },
    );
    vi.unstubAllGlobals();
  });
});

/* ------------------------------------------------------------------ */
/* F. MediaScoreModule (ficha) — B2: mangá de 10; B5: número locale    */
/* ------------------------------------------------------------------ */

const MANGA_SCORE: MediaScoreType = {
  consolidated: 79,
  confidence: "high",
  explanation: "Baseado em 2 fontes.",
  sources: [
    { source: "mal", score: 90, maxScore: 100 },
    { source: "kitsu", score: 83, maxScore: 100 },
  ],
};

describe("MediaScoreModule (ficha)", () => {
  it("mangá: aria '7,9 de 10' (nunca 'de 100') e número central '7,9'", () => {
    const { getByTestId, container } = providers(
      <MediaScoreModule score={MANGA_SCORE} mediaType="manga" />,
    );
    const svg = getByTestId("score-module").querySelector("svg[role=img]");
    expect(svg?.getAttribute("aria-label")).toBe("Score geral 7,9 de 10, baseado em 2 fontes");
    expect(container.textContent).toContain("7,9");
    expect(container.textContent).not.toContain("7.9");
  });

  it("game: aria '84 de 100' preservado", () => {
    const { getByTestId } = providers(
      <MediaScoreModule
        score={{ ...MANGA_SCORE, consolidated: 84, sources: [MANGA_SCORE.sources[0]] }}
        mediaType="game"
      />,
    );
    const svg = getByTestId("score-module").querySelector("svg[role=img]");
    expect(svg?.getAttribute("aria-label")).toBe("Score geral 84 de 100, baseado em 1 fontes");
  });
});

/* ------------------------------------------------------------------ */
/* G. MediaCardShell (cards estáticos) — B2: mangá 7,9/10 no aria      */
/* ------------------------------------------------------------------ */

const MANGA_ITEM: MediaItem = {
  id: "manga-1",
  slug: "some-manga",
  titulo: "Some Manga",
  titulo_original: "Some Manga",
  tipo: "MANGA",
  ano_lancamento: 2020,
  imagem_url: null,
  score: 79,
  numFontes: 2,
};

describe("MediaCardShell (cards de carrossel)", () => {
  it("mangá cru 0-100: card aria mostra 'MEDIA Score 7,9/10' (não '7.9/100')", () => {
    const { container } = providers(
      <MediaCardShell
        media={MANGA_ITEM}
        tCatalog={(k) => k}
        tWatchlist={(k) => k}
        tInteraction={(k) => k}
        locale="pt-BR"
      />,
    );
    const card = container.querySelector(`[aria-label*="Some Manga"]`);
    expect(card?.getAttribute("aria-label")).toContain("MEDIA Score 7,9/10");
    expect(card?.getAttribute("aria-label")).not.toContain("/100");
  });
});
