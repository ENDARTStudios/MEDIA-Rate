import { describe, it, expect } from "vitest";
import { conjugacaoPorTipo, colunaLabelKey } from "@/lib/watchlist-labels";
import ptBR from "@/messages/pt-BR.json";
import enUS from "@/messages/en-US.json";
import esES from "@/messages/es-ES.json";

/**
 * T239 — vocabulário por tipo de mídia nas colunas da watchlist:
 * FILME/SERIE → ver; GAME → jogar; LIVRO/COMIC/MANGA → ler; DROPPED →
 * "Abandonei" comum. Enums da API inalterados (apenas rótulos).
 */

type Locale = Record<string, Record<string, string>>;
const LOCALES: Record<string, Locale> = {
  "pt-BR": ptBR as unknown as Locale,
  "en-US": enUS as unknown as Locale,
  "es-ES": esES as unknown as Locale,
};

const CASOS: {
  tipo: string | undefined;
  coluna: string;
  esperado: string; // chave i18n
  pt: string;
  en: string;
  es: string;
}[] = [
  // Filmes/séries → ver
  {
    tipo: "movie",
    coluna: "WANT",
    esperado: "queroVer",
    pt: "Quero Ver",
    en: "Want to Watch",
    es: "Quiero Ver",
  },
  {
    tipo: "series",
    coluna: "WATCHING",
    esperado: "vendo",
    pt: "Vendo",
    en: "Watching",
    es: "Viendo",
  },
  { tipo: "FILME", coluna: "COMPLETED", esperado: "vi", pt: "Vi", en: "Watched", es: "Vi" },
  // Games → jogar
  {
    tipo: "game",
    coluna: "WANT",
    esperado: "queroJogar",
    pt: "Quero Jogar",
    en: "Want to Play",
    es: "Quiero Jugar",
  },
  {
    tipo: "GAME",
    coluna: "WATCHING",
    esperado: "jogando",
    pt: "Jogando",
    en: "Playing",
    es: "Jugando",
  },
  { tipo: "game", coluna: "COMPLETED", esperado: "zerei", pt: "Zerei", en: "Beat", es: "Completé" },
  // Livros/HQs/mangás → ler
  {
    tipo: "book",
    coluna: "WANT",
    esperado: "queroLer",
    pt: "Quero Ler",
    en: "Want to Read",
    es: "Quiero Leer",
  },
  {
    tipo: "comic",
    coluna: "WATCHING",
    esperado: "lendo",
    pt: "Lendo",
    en: "Reading",
    es: "Leyendo",
  },
  { tipo: "MANGA", coluna: "COMPLETED", esperado: "li", pt: "Li", en: "Read", es: "Leí" },
  // DROPPED → comum
  {
    tipo: "game",
    coluna: "DROPPED",
    esperado: "abandonei",
    pt: "Abandonei",
    en: "Dropped",
    es: "Abandoné",
  },
  {
    tipo: "movie",
    coluna: "DROPPED",
    esperado: "abandonei",
    pt: "Abandonei",
    en: "Dropped",
    es: "Abandoné",
  },
  {
    tipo: "manga",
    coluna: "DROPPED",
    esperado: "abandonei",
    pt: "Abandonei",
    en: "Dropped",
    es: "Abandoné",
  },
];

describe("colunaLabelKey (T239) — matriz tipo×coluna×locale", () => {
  it.each(CASOS)("$tipo/$coluna → $esperado ($pt)", ({ tipo, coluna, esperado, pt, en, es }) => {
    expect(colunaLabelKey(tipo, coluna)).toBe(esperado);
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const rotulo = msgs.watchlist[esperado];
      expect(rotulo).toBeTruthy();
      const esperadoTexto = { "pt-BR": pt, "en-US": en, "es-ES": es }[loc];
      expect(rotulo).toBe(esperadoTexto);
    }
  });

  it("conjugacaoPorTipo: game→jogar, book/comic/manga→ler, resto→ver", () => {
    expect(conjugacaoPorTipo("game")).toBe("jogar");
    expect(conjugacaoPorTipo("GAME")).toBe("jogar");
    expect(conjugacaoPorTipo("book")).toBe("ler");
    expect(conjugacaoPorTipo("comic")).toBe("ler");
    expect(conjugacaoPorTipo("manga")).toBe("ler");
    expect(conjugacaoPorTipo("LIVRO")).toBe("ler");
    expect(conjugacaoPorTipo("movie")).toBe("ver");
    expect(conjugacaoPorTipo("series")).toBe("ver");
    expect(conjugacaoPorTipo(undefined)).toBe("ver");
    expect(conjugacaoPorTipo("FILME")).toBe("ver");
  });

  it("coluna desconhecida → fallback queroVer (nunca quebra)", () => {
    expect(colunaLabelKey("game", "INEXISTENTE")).toBe("queroVer");
  });
});
