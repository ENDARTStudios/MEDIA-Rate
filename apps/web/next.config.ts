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
  // Transpile next-intl (necessário para App Router).
  // typedRoutes desativado porque conflita com locale prefix.
  // Imagens externas (pôsters do TMDB).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }],
  },
  // Não expor X-Powered-By (T1.2 já faz no backend, reforçamos aqui).
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
