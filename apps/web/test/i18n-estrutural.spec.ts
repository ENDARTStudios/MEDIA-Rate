import { describe, it, expect } from "vitest";
import ptBR from "@/messages/pt-BR.json";
import enUS from "@/messages/en-US.json";
import esES from "@/messages/es-ES.json";

/**
 * T243 — i18n estrutural: rótulos de categoria NUNCA em PT nos locales
 * EN/ES. Verifica as chaves usadas pelos componentes corrigidos
 * (HeroIconCluster, SearchCommand, ComparePage) nos 3 idiomas.
 */

type Locale = Record<string, Record<string, string>>;
const LOCALES: Record<string, Locale> = {
  "pt-BR": ptBR as unknown as Locale,
  "en-US": enUS as unknown as Locale,
  "es-ES": esES as unknown as Locale,
};

/** Termos PT que NÃO podem aparecer como valor de chave em EN/ES
 * (exclui 'Games' — idêntico em EN — e 'Game', válido em ambos). */
const TERMOS_PROIBIDOS_EN_ES = ["Filmes", "Séries", "Livros", "Quadrinhos", "Mangás", "Filme", "Série", "Livro", "Mangá", "HQ"];

describe("T243 — i18n estrutural: categorias por locale", () => {
  it("chaves singulares de tipo existem nos 3 locales (typeMovie..typeManga)", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const c = msgs.catalog;
      for (const k of ["typeMovie", "typeSerie", "typeGame", "typeBook", "typeComic", "typeManga"]) {
        expect(c[k], `${loc}.catalog.${k}`).toBeTruthy();
      }
    }
  });

  it("chaves plurais de tipo existem nos 3 locales (filme..manga)", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const c = msgs.catalog;
      for (const k of ["filme", "serie", "game", "livro", "comic", "manga"]) {
        expect(c[k], `${loc}.catalog.${k}`).toBeTruthy();
      }
    }
  });

  it("EN/ES não exibem rótulos de categoria em português", () => {
    for (const loc of ["en-US", "es-ES"] as const) {
      const c = LOCALES[loc].catalog;
      const valores = Object.entries(c)
        .filter(([k]) => /^(type|filme|serie|game|livro|comic|manga)/.test(k))
        .map(([, v]) => v);
      for (const proibido of TERMOS_PROIBIDOS_EN_ES) {
        for (const v of valores) {
          expect(v, `${loc} contém '${proibido}' em '${v}'`).not.toBe(proibido);
        }
      }
    }
  });

  it("EN: Movies/Series/Games/Books/Comics/Manga (plurais corretos)", () => {
    const c = LOCALES["en-US"].catalog;
    expect(c.filme).toBe("Movies");
    expect(c.serie).toBe("Series");
    expect(c.game).toBe("Games");
    expect(c.livro).toBe("Books");
    expect(c.comic).toBe("Comics");
    expect(c.manga).toBe("Manga");
  });

  it("ES: Películas/Series/Juegos/Libros/Cómics/Manga (plurais corretos)", () => {
    const c = LOCALES["es-ES"].catalog;
    expect(c.filme).toBe("Películas");
    expect(c.serie).toBe("Series");
    expect(c.game).toBe("Juegos");
    expect(c.livro).toBe("Libros");
    expect(c.comic).toBe("Cómics");
    expect(c.manga).toBe("Manga");
  });

  it("footer.lgpd sem 'LGPD' cru em EN/ES (T242 reforço)", () => {
    expect(LOCALES["en-US"].footer.lgpd).not.toBe("LGPD");
    expect(LOCALES["es-ES"].footer.lgpd).not.toBe("LGPD");
  });
});
