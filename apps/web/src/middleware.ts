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
      const locale = pathname.split("/")[1] || "pt-BR";
      const loginUrl = new URL(`/${locale}/login`, request.url);
      const redirect = NextResponse.redirect(loginUrl);
      redirect.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      return redirect;
    }
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
