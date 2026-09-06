import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

const AI_TRAINING_BOTS = [
  "GPTBot",
  "CCBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "meta-externalagent",
  "Bytespider",
  "Applebot-Extended",
];

const AI_SEARCH_BOTS = ["PerplexityBot", "Amazonbot", "YouBot", "cohere-ai"];

function rulesArray() {
  const { rules } = robots();
  return Array.isArray(rules) ? rules : [rules];
}

describe("robots.txt (T030/D-440)", () => {
  it("preserva a regra existente: * permite / e bloqueia /api/", () => {
    const generic = rulesArray().find((r) =>
      Array.isArray(r.userAgent) ? r.userAgent.includes("*") : r.userAgent === "*",
    );
    expect(generic).toBeDefined();
    expect(generic?.allow).toContain("/");
    expect(generic?.disallow).toContain("/api/");
  });

  it("Grupo A: bots de treino recebem Disallow: /", () => {
    for (const bot of AI_TRAINING_BOTS) {
      const rule = rulesArray().find((r) =>
        Array.isArray(r.userAgent) ? r.userAgent.includes(bot) : r.userAgent === bot,
      );
      expect(rule, `regra ausente para ${bot}`).toBeDefined();
      expect(rule?.disallow).toContain("/");
    }
  });

  it("Grupo B: bots de busca com IA bloqueiam rotas de imagem, sem bloqueio geral", () => {
    for (const bot of AI_SEARCH_BOTS) {
      const rule = rulesArray().find((r) =>
        Array.isArray(r.userAgent) ? r.userAgent.includes(bot) : r.userAgent === bot,
      );
      expect(rule, `regra ausente para ${bot}`).toBeDefined();
      expect(rule?.disallow).toContain("/_next/image");
      expect(rule?.disallow).toContain("/_vercel/image");
      expect(rule?.disallow).not.toContain("/");
    }
  });

  it("Googlebot e Bingbot permanecem sem bloqueio de imagens (SEO)", () => {
    for (const bot of ["Googlebot", "Bingbot"]) {
      const rule = rulesArray().find((r) =>
        Array.isArray(r.userAgent) ? r.userAgent.includes(bot) : r.userAgent === bot,
      );
      if (rule?.disallow) {
        const blocks = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
        expect(blocks).not.toContain("/");
        expect(blocks).not.toContain("/_next/image");
        expect(blocks).not.toContain("/_vercel/image");
      }
    }
  });
});
