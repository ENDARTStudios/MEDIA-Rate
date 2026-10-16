/**
 * D-590/D-591 (T211) — fonte ÚNICA das rotas de conteúdo pré-renderizado.
 *
 * Estas páginas (6 × 3 locales) são conteúdo editorial: `dynamic = "force-static"`
 * + `revalidate = 3600` nelas. Aparecem em dois lugares que precisam concordar sob
 * pena de drift silencioso:
 *  - `next.config.ts` → escopo do `Cache-Control` (elas NÃO podem receber o
 *    `max-age=0` global, senão o header de ISR do Next é sobrescrito e o CDN não
 *    cacheia — foi o achado do D-590);
 *  - `middleware.ts` → elas NÃO recebem `Set-Cookie` (`x-mr-uid`) nem o header
 *    `x-mr-platform`, porque resposta cacheável com cookie/header por visitante
 *    não é cacheável (e, pior, um cache compartilhado serviria o bucket de um
 *    visitante para os outros).
 */

export const LOCALES_CONTEUDO = ["pt-BR", "en-US", "es-ES"] as const;

export const PAGINAS_CONTEUDO = [
  "about",
  "faq",
  "sources",
  "methodology",
  "terms",
  "privacy",
] as const;

/** Caminhos sem barra inicial, como o middleware e o `source` do Next esperam. */
export const CAMINHOS_CONTEUDO: string[] = LOCALES_CONTEUDO.flatMap((locale) =>
  PAGINAS_CONTEUDO.map((pagina) => `${locale}/${pagina}`),
);

/** Grupo literal (`(a|b|…)`) para o `source` do `next.config.ts`. */
export const GRUPO_CONTEUDO = `(${CAMINHOS_CONTEUDO.join("|")})`;

/** Exclusão literal (`a|b|…`) para lookahead negativo. */
export const EXCLUSAO_CONTEUDO = CAMINHOS_CONTEUDO.join("|");

/**
 * `true` quando o pathname (com ou sem barra inicial, com ou sem query) é uma das
 * rotas de conteúdo estático.
 */
export function ehConteudoEstatico(pathname: string): boolean {
  const limpo = pathname.split("?")[0].replace(/^\//, "").replace(/\/$/, "");
  return (CAMINHOS_CONTEUDO as readonly string[]).includes(limpo);
}
