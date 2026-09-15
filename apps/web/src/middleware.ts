import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { plataformaParaRequest } from "./lib/platform-routing";

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

/** Cookie anônimo estável — distinctId do bucket de rollout (D-507). */
const UID_COOKIE = "x-mr-uid";

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const pathname = request.nextUrl.pathname;

  if (isPrivateRoute(pathname)) {
    const sessCookie = request.cookies.get("sess")?.value;
    if (!sessCookie) {
      // T359: `pathname.split("/")[1]` assumia locale sempre presente — para
      // /dashboard (sem prefixo) extraía "dashboard" e gerava /dashboard/login,
      // que é private (prefixo /dashboard) → loop infinito (ERR_TOO_MANY_REDIRECTS).
      // Só usa o segmento se for um locale válido; senão cai no default.
      const segment = pathname.split("/")[1] ?? "";
      const locale = (routing.locales as readonly string[]).includes(segment)
        ? segment
        : routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      const redirect = NextResponse.redirect(loginUrl);
      redirect.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      return redirect;
    }
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  // T030/D-441: previews nunca indexados. Só quando VERCEL_ENV=preview —
  // produção intacta. Não sobrescreve o header mais forte das rotas privadas.
  if (process.env.VERCEL_ENV === "preview" && !response.headers.has("X-Robots-Tag")) {
    response.headers.set("X-Robots-Tag", "noindex");
  }

  // T454/D-507: hook de decisão do dual-deploy (rollout gradual pela flag
  // cloudflare_migration do PostHog). NÃO redireciona — instrumenta a
  // decisão por request (header x-mr-platform) que a camada de proxy/CDN
  // usa para rotear. Falha/ausência da flag → "vercel" (default OFF, na
  // própria plataforma decidirPlataforma/platform-routing).
  try {
    const uid = request.cookies.get(UID_COOKIE)?.value ?? crypto.randomUUID();
    const plataforma = await plataformaParaRequest(uid);
    response.headers.set("x-mr-platform", plataforma);
    if (!request.cookies.get(UID_COOKIE)) {
      response.cookies.set(UID_COOKIE, uid, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  } catch {
    // roteamento nunca derruba a request: sem header → default Vercel.
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
