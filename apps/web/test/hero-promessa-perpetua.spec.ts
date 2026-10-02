import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * T087 — guarda de regressão jurídica: a hero NÃO pode prometer gratuidade
 * perpétua.
 *
 * Motivo: a microcopy de confiança da hero dizia "Plano Free: grátis para
 * sempre" (en: "free forever", es: "gratis para siempre"). Uma promessa perpétua
 * de gratuidade é oferta vinculante de prazo indeterminado (CDC art. 30): obriga
 * o fornecedor a manter o plano Free gratuito indefinidamente e impede qualquer
 * mudança futura de monetização (limites, anúncios, descontinuação).
 *
 * Este teste falha se a alegação voltar a qualquer locale — de propósito.
 */

const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

/** Promessas perpétuas/indeterminadas — não usar em copy de marketing. */
const PROMESSA_PERPETUA =
  /gr[áa]tis para sempre|free forever|gratis para siempre|gratuito para sempre|perpetu[oa]|para sempre gr/i;

function loadMessages(locale: string): Record<string, unknown> {
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

describe("T087 — hero sem promessa perpétua de gratuidade", () => {
  it("a chave landing.ctaTrust não existe em nenhum locale", () => {
    for (const locale of LOCALES) {
      const msgs = loadMessages(locale);
      const landing = msgs["landing"] as Record<string, unknown>;
      expect(landing, `${locale}: namespace landing ausente`).toBeDefined();
      expect(
        landing["ctaTrust"],
        `${locale}: landing.ctaTrust foi reintroduzida — promessa perpétua é risco jurídico (T087)`,
      ).toBeUndefined();
    }
  });

  it("nenhuma string de copy nos 3 locales contém promessa perpétua", () => {
    const ofensores: string[] = [];
    for (const locale of LOCALES) {
      for (const [chave, valor] of walk(loadMessages(locale))) {
        if (typeof valor === "string" && PROMESSA_PERPETUA.test(valor)) {
          ofensores.push(`${locale}:${chave} = ${JSON.stringify(valor.slice(0, 120))}`);
        }
      }
    }
    expect(
      ofensores,
      `copy com promessa perpétua detectada (T087):\n${ofensores.join("\n")}`,
    ).toEqual([]);
  });

  it("os 3 locales mantêm paridade estrutural após a remoção", () => {
    const conjuntos = LOCALES.map((l) => new Set(walk(loadMessages(l)).map(([k]) => k)));
    const [ptBR, enUS, esES] = conjuntos;
    expect(ptBR, "en-US divergente de pt-BR").toEqual(enUS);
    expect(ptBR, "es-ES divergente de pt-BR").toEqual(esES);
    expect(ptBR, "pt-BR vazio").toBeDefined();
    expect(ptBR?.size ?? 0).toBeGreaterThan(0);
  });
});
