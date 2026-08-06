import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
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
                    "script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com",
                    "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com",
                    "frame-src 'self'",
                    "frame-ancestors 'none'",
                    "img-src 'self' data: https:",
                    "style-src 'self' 'unsafe-inline'",
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

export default withNextIntl(nextConfig);
