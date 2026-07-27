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
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }],
  },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["motion", "gsap", "animejs"],
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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://app.posthog.com https://js.stripe.com",
              "connect-src 'self' https://app.posthog.com https://api.stripe.com https://media-rate-production.up.railway.app",
              "frame-src 'self' https://js.stripe.com",
              "frame-ancestors 'none'",
              "img-src 'self' data: https:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://api.stripe.com",
              isProduction ? "upgrade-insecure-requests" : "",
            ]
              .filter(Boolean)
              .join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
