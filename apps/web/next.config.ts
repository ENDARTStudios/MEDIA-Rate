import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
// D-591: fonte unica das rotas de conteudo pre-renderizado (compartilhada com o middleware).
import { GRUPO_CONTEUDO, EXCLUSAO_CONTEUDO } from "./src/lib/static-content";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Next.js config.
 *
 * T021/7.1 — CSP restritiva:
 * - script-src: usa 'strict-dynamic' + nonce para Next.js Script inline.
 *   'strict-dynamic' permite que scripts carregados via nonce carreguem
 *   dinamicamente outros scripts (necessario para Next.js App Router).
 * - style-src: mantem 'unsafe-inline' para TailwindCSS (justificado em DECISOES.md).
 * - SRI: N/A — zero scripts externos via CDN. GSAP/Motion/Anime.js sao
 *   empacotados pelo Next.js (optimizePackageImports). Fontes Google sao
 *   self-hosted via next/font.
 */
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) ||
      "local",
  },
  reactStrictMode: true,
  // T452/D-503: gera .map dos bundles do browser para o upload no Sentry
  // (ci.yml → "Sentry sourcemaps"). Sem isso o passo sobe 0 arquivos.
  productionBrowserSourceMaps: true,
  images: {
    // T032/D-445: larguras travadas nos tokens do uso real (cards 300px, hero 100vw).
    deviceSizes: [320, 640, 960, 1280, 1920],
    imageSizes: [64, 128, 256],
    // D-592 (T211): o D-445 fixava `["image/webp"]` por causa da cota de imagens do
    // plano Hobby. Com o PRO ativo, a cota deixou de ser restrição — medido no
    // Vercel Observability: **32 transformações em 30 dias** (limite Hobby: 1.000
    // imagens-fonte). AVIF vem primeiro porque o `Accept` do navegador decide a
    // ordem: quem suporta recebe AVIF (~20-40% menor que WebP em foto), o resto cai
    // em WebP e, por último, no formato original.
    formats: ["image/avif", "image/webp"],
    // D-592: default do Next é 60s — cada re-otimização custa CPU e uma
    // transformação. 31 dias alinha o cache da imagem ao ciclo real dos pôsteres.
    minimumCacheTTL: 2678400,
    qualities: [75],
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
      // Pôsteres do seed-posters (T226/T255): IGDB, OpenLibrary, Google
      // Books, MyAnimeList (Jikan) — sem esses, o _next/image retorna 400
      // e os cards de games/livros/mangás ficam sem imagem.
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      // T383 (Fase C): capas de mangás (AniList) e HQs (ComicVine) —
      // sem esses domínios o next/image retorna 400 e os cards quebram.
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "comicvine.gamespot.com" },
      { protocol: "https", hostname: "static.comicvine.com" },
    ],
  },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["motion", "gsap", "animejs"],
  },
  // T098: Proxy /api/* to Railway for same-origin cookies (first-party).
  // The browser sees api calls as vercel.app/api/* → no third-party cookie blocking.
  async rewrites() {
    const apiTarget =
      process.env.API_PROXY_TARGET || "https://media-rate-production.up.railway.app";
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${apiTarget}/health`,
      },
    ];
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";
    /**
     * D-590 (T211): as seis páginas de conteúdo institucional passaram a ser
     * pré-renderizadas (`dynamic = "force-static"` nelas, ver D-589/D-590). O
     * `Cache-Control` global abaixo **sobrescrevia** o header de ISR que o Next
     * gera para elas (`s-maxage=…`), então mesmo estáticas o CDN não as cachearia.
     * Agora há duas regras: a primeira (mesmos headers de SEGURANÇA, sem
     * `Cache-Control`) cobre só essas rotas e deixa o header do Next valer; a
     * segunda vale para o resto e mantém `max-age=0, must-revalidate`.
     */
    const SEGURANCA = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // CSP é header de PRODUÇÃO (Next dev usa eval — o header quebraria
      // o dev server; T196). Em dev, não envia CSP.
      ...(isProduction
        ? [
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                // T361: Google Identity Services (script + iframe do botão).
                "script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com https://accounts.google.com",
                // T315: Sentry ingest (regiões us/eu/de — o host é
                // o<org>.ingest.<região>.sentry.io, logo o wildcard precisa
                // cobrir cada região explicitamente).
                "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.us.sentry.io https://*.ingest.eu.sentry.io https://*.ingest.de.sentry.io",
                "frame-src 'self' https://accounts.google.com",
                "frame-ancestors 'none'",
                "img-src 'self' data: https:",
                // T404: GSI injeta folha de estilo externa (accounts.google.com/gsi/style)
                // — sem ela o botão do Google renderiza sem estilo (achado A2 da T403).
                "style-src 'self' 'unsafe-inline' https://accounts.google.com",
                "font-src 'self' data:",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "upgrade-insecure-requests",
              ].join("; "),
            },
          ]
        : []),
    ];

    return [
      {
        // Conteúdo pré-renderizado: `Cache-Control` de ISR **explícito**, e não
        // "deixe o Next emitir". Motivo medido em produção (D-592): o Next emite o
        // header de ISR localmente (`next start`), mas na Vercel o matcher não
        // honrava a exclusão por lookahead da segunda regra e o `max-age=0` global
        // vencia — a página saía pré-renderizada (`x-vercel-cache: PRERENDER`) mas
        // com instrução de não cachear. Explicitar aqui torna o resultado igual nas
        // duas plataformas.
        source: `/${GRUPO_CONTEUDO}`,
        headers: [
          ...SEGURANCA,
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Demais rotas: só segurança. O `Cache-Control` delas é decidido pelo
        // Next/Vercel por tipo de renderização — medido em produção: dinâmica sai
        // `private, no-cache, no-store` (a regra global anterior era sobrescrita de
        // qualquer forma) e estática técnica segue o default da plataforma.
        source: `/((?!api|_next/static|_next/image|favicon.ico|${EXCLUSAO_CONTEUDO}$).*)`,
        headers: SEGURANCA,
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // T293: sem SENTRY_AUTH_TOKEN o upload de source maps é pulado (free tier).
  // `silent` reduz o ruído do plugin no build.
  silent: true,
});
