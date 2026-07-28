import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const privateRoutePrefixes = [
  "/admin",
  "/assistant",
  "/dashboard",
  "/feedback",
  "/login",
  "/onboarding",
  "/profile",
  "/register",
  "/settings",
  "/user/",
  "/watchlist",
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

  if (isPrivateRoute(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
