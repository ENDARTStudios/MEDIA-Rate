import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ptBR from "@/messages/pt-BR.json";
import enUS from "@/messages/en-US.json";
import esES from "@/messages/es-ES.json";

/**
 * T472 (D-536) — paridade das matrizes de privacidade.
 *
 * Fonte única de verdade: docs/PRIVACY_MATRIX.md. A página /privacy renderiza
 * uma tradução fiel dela via chaves i18n (privacy.sRetTable / privacy.sTrTable).
 * Este guard impede texto duplicado divergente:
 *  - chaves de matriz existem e não vazias nos 3 idiomas;
 *  - mesma estrutura (nº de linhas e colunas por linha) nos 3 idiomas;
 *  - mesmos operadores nos 3 idiomas E na matriz-documento (fonte única);
 *  - nº de categorias de retenção igual ao da matriz-documento.
 */

type Locale = Record<string, Record<string, string>>;
const LOCALES: Record<string, Locale> = {
  "pt-BR": ptBR as unknown as Locale,
  "en-US": enUS as unknown as Locale,
  "es-ES": esES as unknown as Locale,
};

const OPERADORES = ["Stripe", "Vercel", "Railway", "Cloudflare", "Sentry", "PostHog", "Google"];

/** Linhas da tabela i18n (pipe-separated): [células, ...]. */
function parseTabela(value: string): string[][] {
  return value
    .split("\n")
    .map((l) => l.split("|").map((c) => c.trim()))
    .filter((cells) => cells.some((c) => c.length > 0));
}

/** Localiza docs/PRIVACY_MATRIX.md subindo a partir do cwd (vitest roda de apps/web). */
function caminhoMatrizDoc(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const cand = resolve(dir, "docs", "PRIVACY_MATRIX.md");
    try {
      readFileSync(cand, "utf-8");
      return cand;
    } catch {
      dir = resolve(dir, "..");
    }
  }
  throw new Error("docs/PRIVACY_MATRIX.md não encontrado a partir de " + process.cwd());
}

function matrizDoc(): { retencaoRows: string[][]; operadoresDoc: string[] } {
  const md = readFileSync(caminhoMatrizDoc(), "utf-8");
  const linhas = md.split("\n");
  const emTabela = (l: string) => /^\|/.test(l.trim());
  const celulas = (l: string) =>
    l
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim().replace(/\*\*/g, ""));

  // Tabela de retenção: linhas de tabela após "## 1." até "###" (nota).
  const i1 = linhas.findIndex((l) => l.startsWith("## 1."));
  const retencao: string[][] = [];
  for (const l of linhas.slice(i1)) {
    if (l.startsWith("###")) break;
    if (emTabela(l) && !/^[\s|:-]+$/.test(l)) retencao.push(celulas(l));
  }

  // Tabela de transferências: linhas de tabela após "## 2." até "###".
  const i2 = linhas.findIndex((l) => l.startsWith("## 2."));
  const transfer: string[][] = [];
  for (const l of linhas.slice(i2)) {
    if (l.startsWith("###")) break;
    if (emTabela(l) && !/^[\s|:-]+$/.test(l)) transfer.push(celulas(l));
  }

  // Primeira linha de cada tabela é o cabeçalho; separator já filtrado.
  return {
    retencaoRows: retencao.slice(1),
    operadoresDoc: transfer.slice(1).map((r) => r[0]),
  };
}

describe("T472 — matrizes de privacidade nos 3 idiomas", () => {
  it("chaves de matriz existem e não vazias (retenção + transferências)", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      for (const k of [
        "sRetTableTitle",
        "sRetTable",
        "sRetNote",
        "sTrTableTitle",
        "sTrTable",
        "sTrNote",
      ]) {
        const v = msgs.privacy[k];
        expect(v, `${loc}.privacy.${k}`).toBeTruthy();
        expect(v.length, `${loc}.privacy.${k}`).toBeGreaterThan(10);
      }
    }
  });

  it("estrutura idêntica nos 3 idiomas: mesmo nº de linhas e colunas por linha", () => {
    for (const chave of ["sRetTable", "sTrTable"]) {
      const tabelas = Object.entries(LOCALES).map(([loc, msgs]) => ({
        loc,
        rows: parseTabela(msgs.privacy[chave]),
      }));
      const [base, ...resto] = tabelas;
      for (const outra of resto) {
        expect(outra.rows.length, `${outra.loc}.${chave} linhas`).toBe(base.rows.length);
        base.rows.forEach((linha, i) => {
          expect(outra.rows[i]?.length, `${outra.loc}.${chave} linha ${i}`).toBe(linha.length);
        });
      }
    }
  });

  it("nenhuma célula vazia nas matrizes", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      for (const chave of ["sRetTable", "sTrTable"]) {
        for (const linha of parseTabela(msgs.privacy[chave])) {
          for (const celula of linha) {
            expect(celula.length, `${loc}.privacy.${chave} célula vazia`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("os 7 operadores aparecem nos 3 idiomas (primeira coluna da matriz de transferências)", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const primeiraColuna = parseTabela(msgs.privacy.sTrTable)
        .slice(1)
        .map((r) => r[0]);
      for (const op of OPERADORES) {
        expect(primeiraColuna, `${loc} contém ${op}`).toContain(op);
      }
    }
  });
});

describe("T472 — fonte única (docs/PRIVACY_MATRIX.md)", () => {
  it("categorias de retenção i18n = categorias da matriz-documento", () => {
    const { retencaoRows } = matrizDoc();
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const linhasI18n = parseTabela(msgs.privacy.sRetTable).length - 1; // -1 cabeçalho
      expect(linhasI18n, `${loc} retenção`).toBe(retencaoRows.length);
    }
  });

  it("operadores da matriz-documento = operadores i18n (mesmo conjunto, mesma ordem)", () => {
    const { operadoresDoc } = matrizDoc();
    expect(operadoresDoc).toEqual(OPERADORES);
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const primeiraColuna = parseTabela(msgs.privacy.sTrTable)
        .slice(1)
        .map((r) => r[0]);
      expect(primeiraColuna, `${loc} ordem dos operadores`).toEqual(operadoresDoc);
    }
  });
});
