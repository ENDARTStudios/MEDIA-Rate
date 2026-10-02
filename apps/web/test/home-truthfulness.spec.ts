import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * BETA-GAP-05 / T121 — home truthfulness (copy).
 *
 * A home (e a FAQ de planos) não pode afirmar funcionalidade/estado contrário
 * ao implementado. Guarda de regressão para o achado auditado:
 * `homeContent.faq1A`/`pricingFaq.faq1A` diziam "mangás de 0 a 100", mas o
 * BETA-GAP-09 implementou **manga = 0–10** (`score-utils.ts`: game 0–100; demais
 * mídias 0–10).
 */

const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

function load(locale: string): Record<string, unknown> {
  const p = path.resolve(process.cwd(), "src/messages", `${locale}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
}

function walk(node: unknown, prefix = ""): [string, unknown][] {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
      walk(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [[prefix, node]];
}

/** Alegação FALSA: grupo "manga(s)" imediatamente associado a escala 0–100. */
const ESCALA_MANGA_100 =
  /mang[aá]s?\s+(?:e\s+)?de\s+0\s+a\s+100|manga\s+(?:and\s+)?0-100|y\s+mangas\s+de\s+0\s+a\s+100/i;

/** Alegação correta: jogos 0–100; demais 0–10 (manga fora do grupo 0–100). */
const ESCALA_POSITIVA = /0\s*a\s*10|0-10/;

/** CTAs/hero primários não podem usar "em breve" como se fosse disponível. */
const EM_BREVE = /em breve|coming soon|pr[óo]ximamente/i;
const CHAVES_CTA = [
  "landing.hero",
  "landing.cta",
  "landing.ctaSecondary",
  "home.ctaText",
  "home.ctaTitle",
];

function get(root: Record<string, unknown>, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[k];
    return undefined;
  }, root);
}

describe("BETA-GAP-05 — home truthfulness (copy)", () => {
  it("nenhuma string afirma manga na escala 0–100 (real: game 0–100; demais 0–10)", () => {
    const ofensores: string[] = [];
    for (const locale of LOCALES) {
      for (const [chave, valor] of walk(load(locale))) {
        if (typeof valor === "string" && ESCALA_MANGA_100.test(valor)) {
          ofensores.push(`${locale}:${chave}`);
        }
      }
    }
    expect(ofensores, `alegação de escala incorreta:\n${ofensores.join("\n")}`).toEqual([]);
  });

  it("FAQ da home e de planos afirma a escala correta nos 3 locales", () => {
    for (const locale of LOCALES) {
      const m = load(locale);
      const homeFaq = String(get(m, "homeContent.faq1A") ?? "");
      const pricingFaq = String(get(m, "pricingFaq.faq1A") ?? "");
      expect(homeFaq, `${locale}: homeContent.faq1A`).toMatch(ESCALA_POSITIVA);
      expect(homeFaq, `${locale}: homeContent.faq1A`).not.toMatch(ESCALA_MANGA_100);
      expect(pricingFaq, `${locale}: pricingFaq.faq1A`).not.toMatch(ESCALA_MANGA_100);
    }
  });

  it("CTAs/hero primários não usam 'em breve/coming soon'", () => {
    const ofensores: string[] = [];
    for (const locale of LOCALES) {
      const m = load(locale);
      for (const chave of CHAVES_CTA) {
        const valor = get(m, chave);
        if (typeof valor === "string" && EM_BREVE.test(valor)) {
          ofensores.push(`${locale}:${chave}`);
        }
      }
    }
    expect(ofensores, `CTA primário com promessa futura:\n${ofensores.join("\n")}`).toEqual([]);
  });

  it("namespaces da home têm paridade de chaves entre os 3 locales", () => {
    const namespaces = ["home", "homeContent", "landing", "pricingFaq"];
    for (const ns of namespaces) {
      const conjuntos = LOCALES.map((l) => new Set(Object.keys((load(l)[ns] as object) ?? {})));
      const [ptBR, enUS, esES] = conjuntos;
      expect([...ptBR].sort(), `${ns}: en-US divergente`).toEqual([...enUS].sort());
      expect([...ptBR].sort(), `${ns}: es-ES divergente`).toEqual([...esES].sort());
    }
  });
});
