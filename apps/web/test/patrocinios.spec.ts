import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PATROCINIOS, TETO_CONCENTRACAO, type Patrocinio } from "../src/lib/sponsorships";

/**
 * Registro público de patrocínios — invariantes do dado e do vínculo com a página.
 *
 * A regra "patrocínio compra visibilidade, não nota" só é verificável se o registro
 * existir e se cada entrada for publicável. Este spec guarda as duas pontas:
 * as invariantes de cada entrada (o que impede uma entrada "confidencial" ou sem rótulo)
 * e o fato de a página ler o registro em vez de escrever a lista à mão.
 */

const RAIZ = path.resolve(__dirname, "..");
const PAGINA = fs.readFileSync(path.join(RAIZ, "src/app/[locale]/apoie/page.tsx"), "utf8");
const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

describe("registro público de patrocínios", () => {
  it("o teto de concentração é uma política declarada", () => {
    expect(TETO_CONCENTRACAO).toBeGreaterThan(0);
    expect(TETO_CONCENTRACAO).toBeLessThanOrEqual(0.5);
  });

  it("cada entrada é publicável: nome, seção, rótulo e data ISO", () => {
    for (const p of PATROCINIOS) {
      expect(p.patrocinador.trim().length, "patrocinador vazio").toBeGreaterThan(1);
      expect(p.secao.trim().length, "seção vazia").toBeGreaterThan(1);
      // O rótulo é o que a transparência entrega: sem ele a entrada não é publicável.
      expect(p.rotulo.trim().length, "rótulo vazio").toBeGreaterThan(3);
      expect(p.desde, `data inválida: ${p.desde}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // "Cliente confidencial" não é registro público.
      expect(p.patrocinador).not.toMatch(/confidencial|anônimo|anonimo|a definir/i);
    }
  });

  it("o tipo aceita uma entrada completa (contrato do dado)", () => {
    const exemplo: Patrocinio = {
      patrocinador: "Exemplo",
      secao: "seção Cinema",
      rotulo: "Conteúdo patrocinado — banner no topo da seção Cinema",
      desde: "2026-01-01",
    };
    expect(exemplo.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("a página lê o registro (API UAT-46, com fallback estático) e tem os dois estados", () => {
    // UAT-46: a fonte passou a ser a API (o Admin alimenta pela Gestão de
    // Usuários); a lista estática segue como fallback honesto.
    expect(PAGINA).toContain('from "@/lib/sponsorships"');
    expect(PAGINA).toContain("/api/v1/patrocinios");
    expect(PAGINA).toContain("patrocinios.length === 0");
    expect(PAGINA).toMatch(/<table/);
    // Nenhuma entrada digitada à mão na página: o formato de `Patrocinio`
    // (`secao`/`rotulo`/`desde`) só pode existir no módulo de dados.
    expect(PAGINA).not.toMatch(/\bsecao:\s*"/);
    expect(PAGINA).not.toMatch(/\brotulo:\s*"/);
  });

  it("o estado vazio e o registro existem nas 3 locales", () => {
    for (const locale of LOCALES) {
      const m = JSON.parse(
        fs.readFileSync(path.join(RAIZ, `src/messages/${locale}.json`), "utf8"),
      ) as Record<string, Record<string, string>>;
      for (const chave of [
        "registryTitle",
        "registryEmpty",
        "registrySponsor",
        "registrySection",
        "registrySince",
        "concentrationNote",
      ]) {
        expect(m.support[chave], `${locale}.support.${chave}`).toBeTruthy();
      }
    }
  });

  it("o estado vazio não vende o que não existe (sem 'em breve')", () => {
    for (const locale of LOCALES) {
      const m = JSON.parse(
        fs.readFileSync(path.join(RAIZ, `src/messages/${locale}.json`), "utf8"),
      ) as Record<string, Record<string, string>>;
      expect(m.support.registryEmpty).not.toMatch(
        /em breve|coming soon|próximamente|pr\u00f3ximamente/i,
      );
    }
  });
});
