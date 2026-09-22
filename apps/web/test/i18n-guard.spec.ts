import { describe, it, expect } from "vitest";
import { leafPaths, loadMessages, usedKeysFromFile, collectMissing } from "@/lib/i18n-guard";
import fs from "node:fs";
import path from "node:path";

/**
 * P1 (review pós-#143) — guarda contra chaves i18n referenciadas sem entrada
 * nas messages (bug `dashboard.profileWebShare`: referência sem chave cruava
 * produção). Falha se qualquer chave usada em `src/` faltar em qualquer locale.
 */

const LOCALES = ["pt-BR", "en-US", "es-ES"];

describe("guarda de chaves i18n (P1)", () => {
  it("nenhuma chave referenciada em src/ está ausente nos 3 locales", () => {
    const missing = collectMissing();
    expect(
      missing,
      `Chaves usadas sem entrada nas messages:\n${missing
        .map((m) => `${m.key} — ausente em ${m.faltando.join(", ")} (${m.file})`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("os 3 locales têm o MESMO conjunto de caminhos (paridade estrutural)", () => {
    const messages = loadMessages();
    const conjuntos = LOCALES.map((l) => leafPaths(messages[l]));
    for (let i = 1; i < conjuntos.length; i++) {
      const soEmA = conjuntos[0].difference?.(conjuntos[i]) ?? [];
      void soEmA;
      const faltaNoB = [...conjuntos[0]].filter((k) => !conjuntos[i].has(k));
      const faltaNoA = [...conjuntos[i]].filter((k) => !conjuntos[0].has(k));
      expect(
        { faltandoEm: LOCALES[i], faltaNoB, faltaNoA },
        `Paridade quebrada entre ${LOCALES[0]} e ${LOCALES[i]}`,
      ).toEqual({ faltandoEm: LOCALES[i], faltaNoB: [], faltaNoA: [] });
    }
  });

  it("o bug profileWebShare não regressa (chave existe nos 3 locales e é usada)", () => {
    const messages = loadMessages();
    const paths = LOCALES.map((l) => leafPaths(messages[l]));
    for (const p of paths) expect(p.has("dashboard.profileWebShare")).toBe(true);
    const arquivo = path.resolve(process.cwd(), "src/components/dashboard/DashboardOverview.tsx");
    const { used } = usedKeysFromFile(arquivo);
    expect(used).toContain("dashboard.profileWebShare");
  });

  it("leafPaths valida caminho completo de chave aninhada", () => {
    const paths = leafPaths({ a: { b: { c: "x" } }, simples: "y" });
    expect(paths.has("a.b.c")).toBe(true);
    expect(paths.has("simples")).toBe(true);
    expect(paths.has("a.b")).toBe(false);
  });

  it("usa fs real do repo para carregar as messages", () => {
    for (const l of LOCALES) {
      const p = path.resolve(process.cwd(), "src/messages", `${l}.json`);
      expect(fs.existsSync(p)).toBe(true);
    }
  });
});
