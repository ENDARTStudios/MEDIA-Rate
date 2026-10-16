import { describe, expect, it } from "vitest";
import {
  CAMINHOS_CONTEUDO,
  ehConteudoEstatico,
  EXCLUSAO_CONTEUDO,
  GRUPO_CONTEUDO,
  LOCALES_CONTEUDO,
  PAGINAS_CONTEUDO,
} from "@/lib/static-content";

/**
 * D-590/D-591 (T211) — a lista de conteúdo pré-renderizado é contrato compartilhado
 * entre `next.config.ts` (escopo do `Cache-Control`) e `middleware.ts` (pular cookie/
 * header por visitante). Um drift silencioso aqui reintroduz o bug de cache do D-590
 * ou um `Set-Cookie` em resposta cacheável (D-591), então a lista e o predicado
 * ficam travados por teste.
 */
describe("static-content", () => {
  it("cobre exatamente 6 páginas × 3 locales", () => {
    expect(PAGINAS_CONTEUDO).toHaveLength(6);
    expect(LOCALES_CONTEUDO).toHaveLength(3);
    expect(CAMINHOS_CONTEUDO).toHaveLength(18);
  });

  it("inclui as páginas institucionais e exclui rotas com estado próprio", () => {
    for (const pagina of PAGINAS_CONTEUDO) {
      for (const locale of LOCALES_CONTEUDO) {
        expect(ehConteudoEstatico(`/${locale}/${pagina}`)).toBe(true);
      }
    }
    // Rotas que dependem de request (moeda, sessão, filtros) NÃO podem entrar.
    for (const rota of [
      "/pt-BR",
      "/pt-BR/pricing",
      "/pt-BR/catalog",
      "/pt-BR/dashboard",
      "/pt-BR/faq-extra",
      "/pt-BR/about/nested",
    ]) {
      expect(ehConteudoEstatico(rota), rota).toBe(false);
    }
  });

  it("normaliza barra final e query", () => {
    expect(ehConteudoEstatico("/pt-BR/about/")).toBe(true);
    expect(ehConteudoEstatico("pt-BR/about")).toBe(true);
    expect(ehConteudoEstatico("/en-US/terms?utm=x")).toBe(true);
    expect(ehConteudoEstatico("/en-US/terms/")).toBe(true);
  });

  it("as strings usadas pelo next.config derivam da mesma lista", () => {
    expect(GRUPO_CONTEUDO).toBe(`(${CAMINHOS_CONTEUDO.join("|")})`);
    expect(EXCLUSAO_CONTEUDO).toBe(CAMINHOS_CONTEUDO.join("|"));
    for (const caminho of CAMINHOS_CONTEUDO) {
      expect(GRUPO_CONTEUDO).toContain(caminho);
      expect(EXCLUSAO_CONTEUDO).toContain(caminho);
    }
  });
});
