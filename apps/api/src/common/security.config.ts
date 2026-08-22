import { FastifyHelmetOptions } from "@fastify/helmet";
import { randomBytes } from "node:crypto";

export interface HelmetConfigOptions {
  isProduction: boolean;
  cspTrustedOrigins: string[];
}

/**
 * Gera nonce unico (base64url) por requisicao.
 * Composto por 16 bytes aleatorios por requisicao.
 */
export function generateRequestNonce(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Monta as diretivas CSP com nonce dinamico.
 * Exportado para uso pelo hook onSend no main.ts.
 *
 * T021/7.1: script-src sem 'unsafe-inline' — usa nonce dinamico.
 * style-src mantem 'unsafe-inline' (TailwindCSS — DECISOES.md).
 */
export function buildCspHeader(params: {
  nonce: string;
  isProduction: boolean;
  cspTrustedOrigins: string[];
}): string {
  const directives: string[] = [];

  directives.push("default-src 'self'");

  if (params.nonce) {
    directives.push(
      `script-src 'self' 'nonce-${params.nonce}'` +
        (params.isProduction ? "" : " 'unsafe-eval'") +
        " https://app.posthog.com https://js.stripe.com" +
        (params.cspTrustedOrigins.length > 0 ? " " + params.cspTrustedOrigins.join(" ") : ""),
    );
  } else {
    directives.push(
      `script-src 'self' https://app.posthog.com https://js.stripe.com` +
        (params.cspTrustedOrigins.length > 0 ? " " + params.cspTrustedOrigins.join(" ") : ""),
    );
  }

  directives.push(
    `connect-src 'self' https://app.posthog.com https://api.stripe.com` +
      (params.cspTrustedOrigins.length > 0 ? " " + params.cspTrustedOrigins.join(" ") : ""),
  );
  directives.push("frame-src 'self' https://js.stripe.com");
  directives.push("img-src 'self' data: https:");
  // T404: GSI injeta folha de estilo externa (accounts.google.com/gsi/style).
  directives.push("style-src 'self' 'unsafe-inline' https://accounts.google.com");
  directives.push("font-src 'self' data:");
  directives.push("object-src 'none'");
  directives.push("base-uri 'self'");
  directives.push("form-action 'self' https://api.stripe.com");

  if (params.isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function buildHelmetOptions(
  overrides: Partial<HelmetConfigOptions> = {},
): FastifyHelmetOptions {
  const isProduction = overrides.isProduction ?? process.env.NODE_ENV === "production";

  return {
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    // noSniff e aplicado por default pelo helmet; contentTypeNoSniff removido (nao existe na v13).
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    // CSP gerenciada via hook onSend (T021/7.1) — nao via Helmet.
    contentSecurityPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    dnsPrefetchControl: { allow: false },
  };
}
