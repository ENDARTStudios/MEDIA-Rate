/**
 * T239 — vocabulário das colunas da watchlist POR TIPO de mídia.
 *
 * Regra de produto: filmes/séries → "ver"; games → "jogar"; livros/HQs/
 * mangás → "ler". DROPPED ("Abandonei") é comum a todos. Os enums da API
 * (WANT/WATCHING/COMPLETED/DROPPED) NÃO mudam — apenas os rótulos.
 *
 * Retorna a CHAVE i18n (não o texto) para uso com useTranslations.
 */

export type WatchlistColuna = "WANT" | "WATCHING" | "COMPLETED" | "DROPPED";

/** Conjugação do verbo de consumo por tipo de mídia (espelho de StatusIcons). */
export function conjugacaoPorTipo(tipo: string | undefined): "ver" | "jogar" | "ler" {
  switch (tipo) {
    case "game":
    case "GAME":
      return "jogar";
    case "book":
    case "comic":
    case "manga":
    case "LIVRO":
    case "COMIC":
    case "MANGA":
      return "ler";
    default:
      return "ver";
  }
}

/** Chave i18n do rótulo da coluna para uma mídia (DROPPED comum a todos). */
export function colunaLabelKey(tipo: string | undefined, coluna: WatchlistColuna | string): string {
  if (coluna === "DROPPED") return "abandonei";
  const verbo = conjugacaoPorTipo(tipo);
  switch (coluna) {
    case "WANT":
      return verbo === "jogar" ? "queroJogar" : verbo === "ler" ? "queroLer" : "queroVer";
    case "WATCHING":
      return verbo === "jogar" ? "jogando" : verbo === "ler" ? "lendo" : "vendo";
    case "COMPLETED":
      return verbo === "jogar" ? "zerei" : verbo === "ler" ? "li" : "vi";
    default:
      return "queroVer";
  }
}
