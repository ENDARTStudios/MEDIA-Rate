import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const privateRoutePrefixes = [
  "/admin",
  "/assistant",
  "/dashboard",
  "/feedback",
  "/onboarding",
  "/profile",
  "/settings",
  "/user/",
  "/watchlist",
  "/checkout/",
];

function isPrivateRoute(pathname: string): boolean {
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);
  const routePath = pathname.replace(localePattern, "") || "/";
  return privateRoutePrefixes.some(
    (prefix) => routePath === prefix || routePath.startsWith(prefix),
  );
}

/**
 * T327 (D-326): CSP com nonce por requisição, sem `unsafe-inline` em
 * script-src. Substitui o header estático de next.config.ts.
 * - nonce = btoa(crypto.randomUUID()) por request.
 * - `x-nonce` no request (o layout pode ler via headers()).
 * - `strict-dynamic` permite que scripts nonce'd carreguem chunks dinâmicos.
 * ⚠️ Trade-off (docs/T327_CSP_NONCE.md): nonce por request → páginas dinâmicas
 * (desabilita ISR/estático do T331). Validar em preview antes de merge.
 */
function cspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://us-assets.i.posthog.com`,
    "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.us.sentry.io https://*.ingest.eu.sentry.io https://*.ingest.de.sentry.io",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export default function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = cspHeader(nonce);

  // Injeta o nonce no request (a página/layout lê via headers()).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const response = intlMiddleware(new NextRequest(request, { headers: requestHeaders }));

  const pathname = request.nextUrl.pathname;

  if (isPrivateRoute(pathname)) {
    const sessCookie = request.cookies.get("sess")?.value;
    if (!sessCookie) {
      const locale = pathname.split("/")[1] || "pt-BR";
      const loginUrl = new URL(`/${locale}/login`, request.url);
      const redirect = NextResponse.redirect(loginUrl);
      redirect.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      redirect.headers.set("Content-Security-Policy", csp);
      return redirect;
    }
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
