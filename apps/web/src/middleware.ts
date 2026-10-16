import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { plataformaParaRequest } from "./lib/platform-routing";
import { ehConteudoEstatico } from "./lib/static-content";

const intlMiddleware = createMiddleware(routing);
const privateRoutePrefixes = [
  "/admin",
  "/assistant",
  "/biblioteca",
  "/compare",
  "/dashboard",
  "/feedback",
  "/historico",
  // D-584 (T211): `/listas`, `/historico` e `/compare` renderizavam "Verificando
  // sessão..." e só então redirecionavam ao login — sempre pelo cliente, ~5s
  // depois (a checagem chama a API). Estando na lista, o redirecionamento é do
  // servidor e acontece antes de qualquer HTML (mesmo comportamento de
  // /watchlist e /biblioteca). `/discoveries` fica FORA de propósito: essa tela
  // tem estado anônimo desenhado ("Entre para ver suas descobertas").
  "/listas",
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
      // D-525: preserva path E query no retorno pós-login (deep link da
      // biblioteca ?status=…&tipo=… não pode perder os filtros). O login
      // sanitiza via getSafeCallbackUrl (só caminho interno).
      const callbackUrl = encodeURIComponent(
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      const loginUrl = new URL(`/${locale}/login?callbackUrl=${callbackUrl}`, request.url);
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
  //
  // D-591 (T211): as rotas de conteúdo pré-renderizado ficam FORA deste hook.
  // Elas são servidas como HTML estático cacheável (D-590) e tanto o `Set-Cookie`
  // do `x-mr-uid` quanto o header `x-mr-platform` variam por visitante — um cache
  // compartilhado não pode guardar isso (e a primeira visita nunca seria cacheada).
  // Consequência aceita e explícita: o rollout do Cloudflare não cobre estas 18
  // páginas editoriais (6 × 3 locales); elas seguem no destino padrão.
  if (!ehConteudoEstatico(pathname)) {
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
  } else {
    // D-591: resposta estática precisa ser cacheável por CDN — e **qualquer**
    // `Set-Cookie` inviabiliza cache compartilhado. O `NEXT_LOCALE` é gravado pelo
    // middleware do next-intl (preferência de idioma); como o app usa
    // `localePrefix: "always"` (o idioma está sempre na URL), o cookie é
    // dispensável **nesta resposta** e segue valendo em todas as rotas dinâmicas,
    // onde a preferência é de fato consumida no próximo redirecionamento de `/`.
    response.headers.delete("set-cookie");
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
