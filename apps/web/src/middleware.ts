import { type NextRequest, NextResponse } from "next/server";
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

export default function middleware(request: NextRequest) {
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

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
