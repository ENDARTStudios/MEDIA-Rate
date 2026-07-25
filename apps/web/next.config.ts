import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Next.js config (T5.3 — CSP sem 'unsafe-inline').
 *
 * CSP aplicada via headers() em src/middleware.ts (não aqui) para permitir
 * nonces dinâmicos. Aqui configuramos apenas o básico.
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
};

export default withNextIntl(nextConfig);
