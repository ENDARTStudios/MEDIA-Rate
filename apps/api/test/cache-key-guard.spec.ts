/**
 * T194 — contrato do guard de padrões de cache (js/incomplete-sanitization).
 *
 * O matcher precisa espelhar o glob do Redis KEYS para o único metacaractere
 * usado pelo serviço: `*` (qualquer sequência, inclusive vazia). A validação
 * rejeita fail-closed o que divergiria entre memória e Redis (controle, NUL,
 * newline, `?`, `[`, `]`, `\`) e padrões longos demais — sem vazar o valor.
 */
import { describe, it, expect } from "vitest";
import {
  combinaPattern,
  validarPattern,
  PatternCacheInvalidoError,
  MAX_PATTERN,
} from "../src/common/cache-key-guard.js";

describe("cache-key-guard — validarPattern (fail-closed)", () => {
  it("aceita os patterns legítimos do serviço (namespace + wildcard)", () => {
    for (const p of ["midias:*", "catalog:*", "discover:*", "midias:abc:media-score:*", "*"]) {
      expect(validarPattern(p)).toBe(p);
    }
  });

  it("aceita pattern sem wildcard (casamento exato)", () => {
    expect(validarPattern("midias:123")).toBe("midias:123");
  });

  it("rejeita ausente, vazio e não-string", () => {
    for (const p of [undefined, null, 42, "", {}]) {
      expect(() => validarPattern(p)).toThrow(PatternCacheInvalidoError);
    }
  });

  it("rejeita caracteres de controle (NUL, newline, CR, tab, DEL)", () => {
    for (const p of ["a\u0000b", "a\nb", "a\rb", "a\tb", "a\u007fb"]) {
      expect(() => validarPattern(p)).toThrow(PatternCacheInvalidoError);
    }
  });

  it("rejeita metacaracteres glob não suportados (? [ ] \\)", () => {
    for (const p of ["a?b", "a[b]", "a\\b", "a]b"]) {
      expect(() => validarPattern(p)).toThrow(PatternCacheInvalidoError);
    }
  });

  it("rejeita pattern acima do limite de comprimento", () => {
    expect(() => validarPattern("a".repeat(MAX_PATTERN + 1))).toThrow(PatternCacheInvalidoError);
    expect(validarPattern("a".repeat(MAX_PATTERN))).toHaveLength(MAX_PATTERN);
  });

  it("mensagem de erro NÃO inclui o valor do pattern", () => {
    const valor = "token-super-secreto\n";
    let capturado: unknown = null;
    try {
      validarPattern(valor);
    } catch (e) {
      capturado = e;
    }
    expect(capturado).toBeInstanceOf(PatternCacheInvalidoError);
    const msg = capturado instanceof Error ? capturado.message : "";
    expect(msg).not.toContain("token-super-secreto");
    expect(msg).toMatch(/pattern de cache invalido/i);
  });
});

describe("cache-key-guard — combinaPattern (glob *-only, ancorado)", () => {
  const casos: [string, string, boolean][] = [
    // prefixo de namespace — o caso central do fallback de memória
    ["midias:*", "midias:uuid-1", true],
    ["midias:*", "midias:", true],
    ["midias:*", "midias", false],
    ["midias:*", "midias2:1", false],
    // namespace escape: prefixo no meio/cercado não pode casar
    ["midias:*", "x:midias:1", false],
    ["catalog:*", "xcatalog:1", false],
    ["midias:*", "xmidias:1", false],
    // múltiplos wildcards (o replace parcial antigo não casava nada disso)
    ["a:*:b*", "a:1:b2", true],
    ["a:*:b*", "a::b", true],
    ["a:*:b*", "a:1:c2", false],
    ["*:media-score", "midias:1:media-score", true],
    ["*:media-score", "midias:1:score", false],
    ["midias:*:media-score", "midias:1:media-score", true],
    ["midias:*:media-score", "midias:1:2:media-score", true],
    ["midias:*:media-score", "x:midias:1:media-score", false],
    ["*:sub*", "midias:1:sub2:x", true],
    // wildcard sozinho casa tudo (inclusive vazio), como no Redis
    ["*", "", true],
    ["*", "qualquer coisa", true],
    // sem wildcard = igualdade exata, case-sensitive
    ["sem-wildcard", "sem-wildcard", true],
    ["sem-wildcard", "sem-wildcards", false],
    ["MIDIAS:*", "midias:1", false],
    // literais adjacentes e sobreposição
    ["a**b", "ab", true],
    ["a**b", "a-x-b", true],
    ["ab*ab", "abab", true],
    ["ab*ab", "ab", false],
    ["a*b*c", "abc", true],
    ["a*b*c", "axbyc", true],
    ["a*b*c", "ac", false],
    ["*abc*", "ab", false],
  ];

  it.each(casos)("pattern %j × chave %j → %s", (pattern, chave, esperado) => {
    expect(combinaPattern(pattern, chave)).toBe(esperado);
  });
});
