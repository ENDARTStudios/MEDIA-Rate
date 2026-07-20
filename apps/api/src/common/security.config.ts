import type { FastifyHelmetOptions } from "@fastify/helmet";

export interface HelmetConfigOptions {
  isProduction: boolean;
  cspTrustedOrigins: string[];
}

export function buildHelmetOptions(
  overrides: Partial<HelmetConfigOptions> = {},
): FastifyHelmetOptions {
  const isProduction = overrides.isProduction ?? process.env.NODE_ENV === "production";
  const cspTrustedOrigins =
    overrides.cspTrustedOrigins ??
    (process.env.CSP_TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  return {
    // HSTS: 1 ano em producao, desativado em dev (nao quebra localhost)
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    // X-Content-Type-Options: nosniff
    contentTypeNoSniff: true,
    // X-Frame-Options: DENY (clickjacking)
    frameguard: { action: "deny" },
    // Remove X-Powered-By
    hidePoweredBy: true,
    // CSP
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://app.posthog.com",
          "https://js.stripe.com",
          ...cspTrustedOrigins,
        ],
        connectSrc: [
          "'self'",
          "https://app.posthog.com",
          "https://api.stripe.com",
          ...cspTrustedOrigins,
        ],
        frameSrc: ["'self'", "https://js.stripe.com"],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", "https://api.stripe.com"],
        ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    // Referrer-Policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // X-DNS-Prefetch-Control
    dnsPrefetchControl: { allow: false },
  };
}
