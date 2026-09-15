import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

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
    // T032/D-445: larguras/formatos/qualidade travados nos tokens do uso
    // real (cards 300px, hero 100vw) — cada largura a menos é uma
    // transformação a menos por poster no plano Hobby.
    deviceSizes: [320, 640, 960, 1280, 1920],
    imageSizes: [64, 128, 256],
    formats: ["image/webp"],
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
    return [
      {
        source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
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
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // T293: sem SENTRY_AUTH_TOKEN o upload de source maps é pulado (free tier).
  // `silent` reduz o ruído do plugin no build.
  silent: true,
});
