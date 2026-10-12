import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { HeroSection } from "@/components/HeroSection";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import { FONTES_ATIVAS, NUM_FONTES_ATIVAS } from "@/lib/sources";
import ptBR from "@/messages/pt-BR.json";
import enUS from "@/messages/en-US.json";
import esES from "@/messages/es-ES.json";

/**
 * Redesenho da hero — guardas de estrutura, verdade e movimento.
 *
 * Contexto: a hero anterior era um trio centralizado (proibido por D-065) com
 * 6 nomes de fonte fixos contra um rótulo que dizia "11 fontes" (o valor real
 * derivado é 14). Estes testes travam:
 *  - ordem do funil (gancho → promessa → prova → CTA) no DOM;
 *  - os 6 pares ícone+cor canônicos preservados (`CATEGORY_TOKENS`);
 *  - contagem/nomes de fontes DERIVADOS (nenhum número digitado);
 *  - presença do bloco de `prefers-reduced-motion` no CSS de movimento;
 *  - ausência de promessa perpétua de gratuidade (T087).
 */

const LOCALES = { "pt-BR": ptBR, "en-US": enUS, "es-ES": esES } as const;

/** Localiza um arquivo de `apps/web/src/components/landing` subindo do cwd. */
function landingCss(file: string): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i += 1) {
    const candidate = resolve(dir, "src", "components", "landing", file);
    try {
      readFileSync(candidate, "utf-8");
      return candidate;
    } catch {
      dir = resolve(dir, "..");
    }
  }
  throw new Error(`não encontrado: src/components/landing/${file} a partir de ${process.cwd()}`);
}

const messages = {
  catalog: {
    catalogAria: "Categorias do catálogo",
    filme: "Filmes",
    serie: "Séries",
    game: "Games",
    livro: "Livros",
    comic: "Quadrinhos",
    manga: "Mangás",
  },
  hero: { mediaScore: "MEDIA Score™" },
};

const props = {
  title: "Pare de decidir no escuro o que assistir, ler ou jogar.",
  subtitle: "Uma só nota que combina crítica, público e consenso.",
  cta: "Criar conta grátis",
  ctaHref: "/register",
  ctaSecondary: "Explorar catálogo",
  ctaSecondaryHref: "/catalog",
  ctaHint: "Sem cadastro para explorar o catálogo.",
  categoriesLabel: "Seis categorias. Uma só nota.",
  proofTitle: "Como nasce cada nota",
  proofBody: "Crítica, público e consenso entram no mesmo cálculo.",
  criticLabel: "Crítica",
  audienceLabel: "Público",
  consensusLabel: "Consenso",
  sourcesLabel: `MEDIA Score™ agrega ${NUM_FONTES_ATIVAS} fontes de avaliação`,
  sourceNames: FONTES_ATIVAS.map((f) => f.nome),
};

function renderHero(overrides: Partial<typeof props> = {}) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      <HeroSection {...props} {...overrides} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  // jsdom não implementa matchMedia — a ilha da constelação consulta no mount.
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

describe("hero — funil e estrutura", () => {
  it("mantém #hero-title (contrato do e2e) com o gancho", () => {
    const { container } = renderHero();
    const h1 = container.querySelector("#hero-title");
    expect(h1?.tagName).toBe("H1");
    expect(h1?.textContent).toBe(props.title);
  });

  it("T209: o gancho é o PRIMEIRO elemento — sem pill/eyebrow acima do H1", () => {
    const { container } = renderHero();
    const h1 = container.querySelector("#hero-title");
    // Achado `hero-eyebrow-chip` (detector de DOM renderizado): o chip de marca
    // acima da headline é o padrão "AI SaaS" e já aparecia 2× dentro do hero
    // (hub da constelação + faixa de prova). Nada pode voltar antes do gancho.
    expect(h1?.previousElementSibling).toBeNull();
  });

  it("nenhum chip uppercase tracked antes do gancho (guarda do anti-padrão)", () => {
    const { container } = renderHero();
    const html = container.innerHTML;
    const hookIndex = html.indexOf("Pare de decidir no escuro");
    expect(html.slice(0, hookIndex)).not.toMatch(/tracking-\[0\.2em\]|uppercase/);
  });

  it("ordem do DOM: gancho → promessa → CTA → categorias → prova", () => {
    const { container } = renderHero();
    const html = container.innerHTML;
    const pos = (needle: string) => {
      const index = html.indexOf(needle);
      expect(index, `não encontrado: ${needle}`).toBeGreaterThan(-1);
      return index;
    };

    const hook = pos("Pare de decidir no escuro");
    const promise = pos("Uma só nota que combina crítica");
    const primaryCta = pos('data-hero-cta="primary"');
    const categories = pos("Seis categorias. Uma só nota.");
    const proof = pos("Como nasce cada nota");

    expect(promise, "promessa deve vir depois do gancho").toBeGreaterThan(hook);
    expect(primaryCta, "CTA primária depois da promessa").toBeGreaterThan(promise);
    expect(categories, "constelação depois da CTA").toBeGreaterThan(primaryCta);
    expect(proof, "prova depois da constelação").toBeGreaterThan(categories);
  });

  it("catálogo é a CTA primária e cadastro a secundária (T474)", () => {
    const { container } = renderHero();
    const primary = container.querySelector('[data-hero-cta="primary"]');
    const secondary = container.querySelector('[data-hero-cta="secondary"]');
    expect(primary?.getAttribute("href")).toContain("/catalog");
    expect(secondary?.getAttribute("href")).toContain("/register");
  });

  // Prática da skill `break-ui` (emilkowalski/skills, MIT — vendorizada em
  // .agents/skills/break-ui): jogar dados worst-case no componente antes de
  // considerar pronto. Aqui: strings de i18n muito longas e registro de fontes
  // vazio (o dia em que o registro mudar não pode quebrar a home).
  it("dados worst-case: título longo, 1 fonte e nenhuma fonte", () => {
    const longTitle =
      "Deja de elegir a ciegas qué ver, leer o jugar cuando tienes cuatro plataformas abiertas y ninguna coincide con lo que quieres ver esta noche";

    const { container: withLongTitle } = renderHero({ title: longTitle });
    expect(withLongTitle.querySelector("#hero-title")?.textContent).toBe(longTitle);

    const { container: singleSource } = renderHero({ sourceNames: ["Metacritic"] });
    expect(singleSource.querySelectorAll("[data-source-chip]")).toHaveLength(2); // 2 cópias do loop
    expect(singleSource.querySelector("[data-testid=hero-sources-marquee]")).not.toBeNull();

    const { container: noSources } = renderHero({ sourceNames: [] });
    expect(noSources.querySelector("[data-testid=hero-sources-marquee]")).toBeNull();
    // A home continua renderizando o funil mesmo sem fontes registradas.
    expect(noSources.querySelector("#hero-title")).not.toBeNull();
    expect(noSources.querySelector('[data-hero-cta="primary"]')).not.toBeNull();
  });

  it("expõe a microcopy de atrito e a legenda das categorias", () => {
    const { container } = renderHero();
    expect(container.textContent).toContain(props.ctaHint);
    expect(container.textContent).toContain(props.categoriesLabel);
  });
});

describe("hero — as 6 categorias canônicas", () => {
  it("renderiza os 6 tipos na ordem canônica, com a cor de cada token", () => {
    const { container } = renderHero();
    const tiles = Array.from(container.querySelectorAll("[data-category-tile]"));
    expect(tiles.map((t) => t.getAttribute("data-category-tile"))).toEqual([
      "movie",
      "series",
      "game",
      "book",
      "comic",
      "manga",
    ]);

    for (const tile of tiles) {
      const type = tile.getAttribute("data-category-tile") as keyof typeof CATEGORY_TOKENS;
      expect(tile.getAttribute("style")).toContain(CATEGORY_TOKENS[type].color);
      // `Link` de @/lib/navigation prefixa o locale (/pt-BR/catalog?...).
      expect(tile.getAttribute("href")).toContain(`/catalog?type=${type}`);
    }
  });

  it("mantém o rótulo acessível e a navegação nomeada", () => {
    const { container } = renderHero();
    const nav = container.querySelector("nav[data-testid=category-icon-row]");
    expect(nav?.getAttribute("aria-label")).toBe(messages.catalog.catalogAria);
    const labels = Array.from(container.querySelectorAll("[data-category-tile]")).map((t) =>
      t.getAttribute("aria-label"),
    );
    expect(labels).toEqual(["Filmes", "Séries", "Games", "Livros", "Quadrinhos", "Mangás"]);
  });

  it("o CSS da constelação desliga todo movimento com prefers-reduced-motion", () => {
    const css = readFileSync(landingCss("category-orbit.module.css"), "utf-8");
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block, "bloco de reduced-motion ausente").not.toBe("");
    for (const selector of [".tileLink", ".iconFloat", ".iconGlow", ".ringArc", ".ringPulse"]) {
      expect(block, `${selector} não é desligado em reduced-motion`).toContain(selector);
    }
    expect(block).toContain("animation: none");
    expect(block).toContain("opacity: 1");
  });
});

describe("hero — verdade dos números e das fontes", () => {
  it("renderiza TODAS as fontes ativas derivadas do registro (não 6 nomes fixos)", () => {
    const { container } = renderHero();
    const chips = Array.from(container.querySelectorAll("[data-source-chip]")).map(
      (c) => c.textContent,
    );
    // Duas cópias (loop contínuo) da lista real.
    expect(chips).toHaveLength(FONTES_ATIVAS.length * 2);
    expect(new Set(chips).size).toBe(FONTES_ATIVAS.length);
    for (const fonte of FONTES_ATIVAS) {
      expect(chips).toContain(fonte.nome);
    }
    expect(NUM_FONTES_ATIVAS).toBe(FONTES_ATIVAS.length);
  });

  it("sourcesLabel usa {count} nos 3 locales e nenhum número digitado", () => {
    for (const [locale, msgs] of Object.entries(LOCALES)) {
      const label = (msgs as { landing: Record<string, string> }).landing.sourcesLabel;
      expect(label, `${locale}: placeholder {count} ausente`).toContain("{count}");
      expect(label, `${locale}: número hardcoded no rótulo de fontes`).not.toMatch(/\d/);
    }
  });

  it("gancho e promessa não carregam estatística inventada", () => {
    for (const [locale, msgs] of Object.entries(LOCALES)) {
      const landing = (msgs as { landing: Record<string, string> }).landing;
      for (const key of ["hero", "heroSubtitle", "ctaHint", "categoriesLabel", "proofBody"]) {
        expect(landing[key], `${locale}.landing.${key} contém número`).not.toMatch(/\d/);
      }
    }
  });

  it("gatilhos de conversão longos o bastante para o gancho (não é slogan de 2 palavras)", () => {
    for (const [locale, msgs] of Object.entries(LOCALES)) {
      const hook = (msgs as { landing: Record<string, string> }).landing.hero;
      const words = hook.trim().split(/\s+/).length;
      expect(words, `${locale}: gancho com ${words} palavras`).toBeGreaterThanOrEqual(5);
      expect(words, `${locale}: gancho longo demais`).toBeLessThanOrEqual(14);
    }
  });

  it("nenhuma promessa perpétua de gratuidade nas chaves da hero (T087)", () => {
    const proibido = /gr[áa]tis para sempre|free forever|gratis para siempre/i;
    for (const [locale, msgs] of Object.entries(LOCALES)) {
      const landing = (msgs as { landing: Record<string, string> }).landing;
      for (const [key, value] of Object.entries(landing)) {
        expect(proibido.test(String(value)), `${locale}.landing.${key}`).toBe(false);
      }
    }
  });
});
