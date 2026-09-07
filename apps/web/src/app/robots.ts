import type { MetadataRoute } from "next";

/**
 * T030/D-440 — robots por bot (mitigação de Image Transformations).
 *
 * - Grupo A (bots de treino de IA): Disallow total — não varrem páginas nem
 *   imagens. Lista: GPTBot, CCBot, ClaudeBot, anthropic-ai, Google-Extended,
 *   meta-externalagent, Bytespider, Applebot-Extended.
 * - Grupo B (busca com IA): navegam, mas NÃO tocam no otimizador de imagens
 *   (`/_next/image`, `/_vercel/image`) nem na API. Lista: PerplexityBot,
 *   Amazonbot, YouBot, cohere-ai.
 * - Regra genérica preservada (allow `/`, disallow `/api/`); Googlebot/Bingbot
 *   e buscadores clássicos seguem sem bloqueio de imagens (SEO).
 * - robots.txt é consultivo: contém crawlers bem-comportados, não todos.
 */
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

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mediarate.app").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: AI_TRAINING_BOTS,
        disallow: ["/"],
      },
      {
        userAgent: AI_SEARCH_BOTS,
        allow: ["/"],
        // "/api/" incluído: sem ele, o grupo B ficaria MAIS permissivo que a
        // regra genérica (grupo específico prevalece sobre `*`).
        disallow: ["/api/", "/_next/image", "/_vercel/image"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
