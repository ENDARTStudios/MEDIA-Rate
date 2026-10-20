/**
 * Filtros de múltipla escolha do catálogo (`?tipo=` e `?genero=`).
 *
 * Por que existem: o desenho do catálogo pede caixas de seleção em Tipo e Gênero, mas a
 * API aceitava **um** valor por filtro. Em vez de obrigar a UI a mentir (checkbox que
 * desmarca o anterior) ou a fazer N requisições, o contrato passou a aceitar **lista
 * separada por vírgula** — mantendo o valor único funcionando exatamente como antes.
 *
 *   /api/v1/midias?tipo=FILME,SERIE      → where.tipo = { in: ["FILME","SERIE"] }
 *   /api/v1/midias?genero=drama,acao     → where.generos = { some: { genero: { slug: { in: [...] } } } }
 *
 * Regras (as mesmas de antes, agora em lista): aliases legados são resolvidos
 * (HQ→COMIC, ANIME→MANGA) e valor desconhecido é **ignorado** — lista completa é o
 * comportamento de sempre para parâmetro inválido.
 */

/** Enum do banco depois da resolução de aliases (TipoMidia). */
export const TIPOS_VALIDOS = ["FILME", "SERIE", "GAME", "LIVRO", "COMIC", "MANGA"] as const;

const TIPO_ALIASES: Record<string, string> = { HQ: "COMIC", ANIME: "MANGA" };

/** "filme, serie" → ["FILME","SERIE"]; aliases resolvidos; inválidos descartados. */
export function parseTipos(tipo: string | undefined): string[] {
  if (!tipo) return [];
  const vistos = new Set<string>();
  for (const bruto of tipo.split(",")) {
    const chave = bruto.trim().toUpperCase();
    if (!chave) continue;
    const resolvido = TIPO_ALIASES[chave] ?? chave;
    if ((TIPOS_VALIDOS as readonly string[]).includes(resolvido)) vistos.add(resolvido);
  }
  return [...vistos];
}

/**
 * "drama,12" → `{ slugs: ["drama"], ids: [12] }`.
 *
 * O filtro por gênero sempre aceitou slug OU id numérico; a lista mantém os dois e a
 * consulta usa `OR` quando os dois aparecem.
 */
export function parseGeneros(genero: string | undefined): { slugs: string[]; ids: number[] } {
  if (!genero) return { slugs: [], ids: [] };
  const slugs: string[] = [];
  const ids: number[] = [];
  for (const bruto of genero.split(",")) {
    const valor = bruto.trim();
    if (!valor) continue;
    const numero = Number(valor);
    if (Number.isInteger(numero) && numero > 0) ids.push(numero);
    else slugs.push(valor);
  }
  return { slugs: [...new Set(slugs)], ids: [...new Set(ids)] };
}

/** Fragmento de `where` para tipo — único valor continua sendo igualdade simples. */
export function condicaoTipo(tipos: string[]): unknown | undefined {
  if (tipos.length === 0) return undefined;
  if (tipos.length === 1) return tipos[0];
  return { in: tipos };
}

/** Fragmento de `where.generos` (relação N:N) para a lista de gêneros. */
export function condicaoGeneros({
  slugs,
  ids,
}: {
  slugs: string[];
  ids: number[];
}): { some: { genero: Record<string, unknown> } } | undefined {
  if (slugs.length === 0 && ids.length === 0) return undefined;
  if (slugs.length > 0 && ids.length > 0) {
    return {
      some: {
        genero: {
          OR: [
            ...(slugs.length === 1 ? [{ slug: slugs[0] }] : [{ slug: { in: slugs } }]),
            ...(ids.length === 1 ? [{ id: ids[0] }] : [{ id: { in: ids } }]),
          ],
        },
      },
    };
  }
  if (slugs.length > 0) {
    return {
      some: { genero: slugs.length === 1 ? { slug: slugs[0] } : { slug: { in: slugs } } },
    };
  }
  return { some: { genero: ids.length === 1 ? { id: ids[0] } : { id: { in: ids } } } };
}
