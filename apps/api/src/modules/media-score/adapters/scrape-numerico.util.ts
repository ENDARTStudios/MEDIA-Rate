/**
 * Extração NUMÉRICA ISOLADA (scraping de nota) — fundamento legal:
 * números são fatos matemáticos, não expressão criativa; fatos não são
 * protegidos por copyright (Feist v. Rural Telephone, 499 U.S. 340;
 * art. 7º Lei 9.610/98). Coleta exclusivamente a nota — sem texto,
 * imagens, metadados editoriais ou estrutura de página.
 */

const JS_JSONLD = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Extrai `aggregateRating.ratingValue` (ou `ratingValue`) do primeiro
 * JSON-LD que o contiver. Retorna apenas o NÚMERO.
 */
export function extrairAggregateRatingJsonLd(html: string): number | null {
  const blocos = [...html.matchAll(JS_JSONLD)];
  for (const bloco of blocos) {
    const conteudo = bloco[1];
    if (!conteudo) continue;
    try {
      const dado = JSON.parse(conteudo) as unknown;
      const valor = buscarRatingValue(dado);
      if (valor != null) return valor;
    } catch {
      // bloco JSON-LD inválido — pula
    }
  }
  return null;
}

function buscarRatingValue(dado: unknown): number | null {
  if (Array.isArray(dado)) {
    for (const item of dado) {
      const v = buscarRatingValue(item);
      if (v != null) return v;
    }
    return null;
  }
  if (typeof dado !== "object" || dado === null) return null;
  const obj = dado as Record<string, unknown>;
  const aggregate = obj["aggregateRating"];
  if (aggregate && typeof aggregate === "object" && !Array.isArray(aggregate)) {
    const v = (aggregate as Record<string, unknown>)["ratingValue"];
    if (v != null) return parseNumero(v);
  }
  const direto = obj["ratingValue"];
  if (direto != null) return parseNumero(direto);
  return null;
}

/** Converte "3.8" | 3.8 → 3.8 | null (apenas número válido ≥ 0). */
export function parseNumero(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string") {
    const limpo = valor.trim().replace(",", ".");
    const n = Number.parseFloat(limpo);
    if (Number.isFinite(n) && n >= 0 && limpo !== "") return n;
  }
  return null;
}

/**
 * Extrai o primeiro número de um padrão regex (ex.: /"tomatometerScore":\s*(\d+)/).
 * O padrão DEVE capturar somente dígitos/ponto — nota numérica isolada.
 */
export function extrairNumeroPorPadrao(html: string, padrao: RegExp): number | null {
  const m = html.match(padrao);
  if (!m || m[1] === undefined) return null;
  return parseNumero(m[1]);
}
