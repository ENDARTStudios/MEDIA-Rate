/**
 * T196-C — contrato da guarda de URL de imagem de display (CodeQL #88
 * `js/incomplete-url-substring-sanitization`).
 *
 * A decisão de transformar a URL NÃO pode vir de substring (`includes`):
 * o host precisa ser extraído por parsing (`new URL`) e comparado
 * exatamente (case-insensitive) contra allowlist explícita; userinfo, porta
 * explícita e esquemas não-https são rejeitados. Casos de bypass cobertos aqui.
 */
import { describe, it, expect } from "vitest";
import {
  HOSTS_IMAGEM_PERMITIDOS,
  hostDeImagemPermitido,
  normalizarUrlImagem,
} from "../src/common/image-url-guard.js";

describe("image-url-guard — hostDeImagemPermitido (allowlist por hostname parseado)", () => {
  const casos: [string, unknown, boolean][] = [
    ["https IGDB", "https://images.igdb.com/igdb/image/upload/t_thumb/co1.jpg", true],
    ["https IGDB raiz", "https://images.igdb.com/", true],
    ["host em maiúsculas (case-insensitive)", "https://IMAGES.IGDB.COM/t_thumb/co1.jpg", true],
    [
      "porta default explícita é a mesma origem",
      "https://images.igdb.com:443/t_thumb/co1.jpg",
      true,
    ],
    ["http (não-https) é rejeitado", "http://images.igdb.com/t_thumb/co1.jpg", false],
    ["subdomínio enganoso (.evil.com)", "https://images.igdb.com.evil.com/t_thumb/co1.jpg", false],
    ["host com prefixo", "https://ximages.igdb.com/t_thumb/co1.jpg", false],
    ["outro host da allowlist? não: tmdb", "https://image.tmdb.org/t/p/w500/x.jpg", false],
    ["porta não padrão", "https://images.igdb.com:8080/t_thumb/co1.jpg", false],
    ["userinfo", "https://user:pass@images.igdb.com/t_thumb/co1.jpg", false],
    ["esquema javascript", "javascript:alert(1)//images.igdb.com/t_thumb/co1.jpg", false],
    ["esquema data", "data:text/html,images.igdb.com/t_thumb/co1.jpg", false],
    ["esquema file", "file:///images.igdb.com/t_thumb/co1.jpg", false],
    ["relativa protocol-relative", "//images.igdb.com/t_thumb/co1.jpg", false],
    ["sem esquema", "images.igdb.com/t_thumb/co1.jpg", false],
    ["string vazia", "", false],
    ["espaço", "   ", false],
    ["não-URL", "nao e url", false],
    ["não-string", 42, false],
    ["null", null, false],
    ["undefined", undefined, false],
  ];

  it.each(casos)("%s → %s", (_nome, entrada, esperado) => {
    expect(hostDeImagemPermitido(entrada)).toBe(esperado);
  });

  it("allowlist é explícita e restrita (não é curinga de domínio)", () => {
    expect([...HOSTS_IMAGEM_PERMITIDOS]).toEqual(["images.igdb.com"]);
  });
});

describe("image-url-guard — normalizarUrlImagem (troca só no pathname)", () => {
  const IGDB = "https://images.igdb.com/igdb/image/upload/t_thumb/co1.jpg";

  it("URL IGDB legítima: t_thumb → t_cover_big", () => {
    expect(normalizarUrlImagem(IGDB)).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg",
    );
  });

  it("host em maiúsculas continua sendo a mesma origem", () => {
    expect(normalizarUrlImagem("https://IMAGES.IGDB.COM/a/t_thumb/b.jpg")).toBe(
      "https://images.igdb.com/a/t_cover_big/b.jpg",
    );
  });

  it("preserva query e hash ao transformar o pathname", () => {
    expect(normalizarUrlImagem(`${IGDB}?size=big#frag`)).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg?size=big#frag",
    );
  });

  it("não transforma ocorrência apenas na query (pathname sem t_thumb)", () => {
    const url = "https://images.igdb.com/a/b.jpg?ref=t_thumb";
    expect(normalizarUrlImagem(url)).toBe(url);
  });

  it("múltiplas ocorrências: troca só a primeira, apenas no pathname", () => {
    expect(normalizarUrlImagem("https://images.igdb.com/t_thumb/x/t_thumb.jpg")).toBe(
      "https://images.igdb.com/t_cover_big/x/t_thumb.jpg",
    );
  });

  it("host IGDB sem t_thumb volta intacto (contrato anterior preservado)", () => {
    const url = "https://images.igdb.com/a/b.jpg";
    expect(normalizarUrlImagem(url)).toBe(url);
  });

  const intocaveis: [string, string][] = [
    ["host enganoso", "https://images.igdb.com.evil.com/t_thumb/co1.jpg"],
    ["domínio no path", "https://evil.com/https://images.igdb.com/t_thumb/co1.jpg"],
    ["domínio na query", "https://evil.com/?u=images.igdb.com/t_thumb"],
    ["userinfo", "https://user:pass@images.igdb.com/t_thumb/co1.jpg"],
    ["porta não padrão", "https://images.igdb.com:8080/t_thumb/co1.jpg"],
    ["esquema javascript", "javascript:alert(1)//images.igdb.com/t_thumb"],
    ["esquema data", "data:text/html,images.igdb.com/t_thumb"],
    ["esquema file", "file:///etc/passwd"],
    ["http", "http://images.igdb.com/t_thumb/co1.jpg"],
    ["relativa protocol-relative", "//images.igdb.com/t_thumb/co1.jpg"],
    ["sem esquema", "images.igdb.com/t_thumb/co1.jpg"],
    ["outra fonte (tmdb)", "https://image.tmdb.org/t/p/w500/x.jpg"],
  ];

  it.each(intocaveis)("%s → intacta", (_nome, url) => {
    expect(normalizarUrlImagem(url)).toBe(url);
  });
});
