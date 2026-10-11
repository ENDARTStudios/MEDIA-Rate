/**
 * T194 — guard de padrões de chave do CacheService (js/incomplete-sanitization).
 *
 * Motivo: o fallback de memória filtrava chaves com
 * `k.includes(pattern.replace("*", ""))` — substituição parcial (só a primeira
 * ocorrência de `*`) e match SEM âncora, divergente do glob do Redis KEYS:
 *  - padrões com múltiplos wildcards não casavam nada na memória;
 *  - chaves onde o prefixo aparecia no meio eram removidas indevidamente
 *    (namespace escape: `delPattern("midias:*")` apagava `x:midias:1`).
 *
 * Contrato: único metacaractere suportado é `*` (qualquer sequência, inclusive
 * vazia) — igual ao glob do Redis. Padrões com metacaracteres que o Redis
 * trataria de outra forma (`?`, `[`, `]`, `\`) são rejeitados fail-closed para
 * não divergir silenciosamente entre memória e Redis. Controle (NUL, \n, \r,
 * tab, DEL) e comprimento excessivo também são rejeitados. Mensagens de erro
 * NUNCA incluem o valor do pattern.
 */

export const MAX_PATTERN = 256;

const META_NAO_SUPORTADO = new Set(["?", "[", "]", "\\"]);

export class PatternCacheInvalidoError extends Error {
  constructor(motivo: string) {
    super(`pattern de cache invalido: ${motivo}`);
    this.name = "PatternCacheInvalidoError";
  }
}

/** Valida um pattern de invalidação fail-closed; devolve o próprio pattern. */
export function validarPattern(pattern: unknown): string {
  if (typeof pattern !== "string" || pattern.length === 0) {
    throw new PatternCacheInvalidoError("ausente, vazio ou nao textual");
  }
  if (pattern.length > MAX_PATTERN) {
    throw new PatternCacheInvalidoError("acima do comprimento maximo");
  }
  for (const ch of pattern) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp < 0x20 || cp === 0x7f) {
      throw new PatternCacheInvalidoError("contem caractere de controle");
    }
    if (META_NAO_SUPORTADO.has(ch)) {
      throw new PatternCacheInvalidoError("contem metacaractere nao suportado (apenas *)");
    }
  }
  return pattern;
}

/**
 * Casamento glob ancorado com `*` (qualquer sequência, inclusive vazia).
 *
 * Implementação sem `replace` parcial e sem regex construída: split nos `*` e
 * verificação posicional (prefixo, sufixo e literais intermediários em ordem,
 * busca mais-à-esquerda — semântica padrão de glob `*`-only e determinística).
 */
export function combinaPattern(pattern: string, chave: string): boolean {
  const partes = pattern.split("*");
  if (partes.length === 1) return chave === pattern;
  const primeira = partes[0] ?? "";
  const ultima = partes[partes.length - 1] ?? "";
  if (!chave.startsWith(primeira)) return false;
  if (!chave.endsWith(ultima)) return false;
  const fim = chave.length - ultima.length;
  let cursor = primeira.length;
  for (let i = 1; i < partes.length - 1; i++) {
    const parte = partes[i] ?? "";
    if (parte.length === 0) continue;
    const idx = chave.indexOf(parte, cursor);
    if (idx < 0 || idx + parte.length > fim) return false;
    cursor = idx + parte.length;
  }
  return cursor <= fim;
}
