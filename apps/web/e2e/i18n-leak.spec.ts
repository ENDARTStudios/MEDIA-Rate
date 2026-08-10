import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Gate i18n-leak (D-266) — HTML SSR sem JS:
 * - T271: /register não vaza PT em EN/ES, usa ¿ no es-ES, zero chave crua e
 *   links com prefixo de locale.
 * - T273: home/catálogo/privacy — og:locale com underscore, rótulo do rodapé
 *   "Seus dados/Your data/Sus datos" (nunca "LGPD" como rótulo), aria-label do
 *   menu de categorias localizado e meta RGPD no /es-ES/privacy.
 *
 * Nota: o HTML bruto contém o flight payload do RSC com o dicionário de
 * mensagens (chaves como "continueWithGoogle" aparecem como dados de
 * hidratação, não como texto visível). Por isso as checagens de texto/chave
 * rodam sobre o HTML com <script> removido.
 */

const REGISTER_PT_PROIBIDOS = [
  "Continuar com Google",
  "Continuar com Apple",
  "Concordo com os",
  "Já tem conta?",
  "Crie sua conta",
  "Login social em breve",
];

const REGISTER_ESPERADO: Record<string, string[]> = {
  "pt-BR": ["Continuar com Google", "Continuar com Apple", "Concordo com os", "Já tem conta?"],
  "en-US": [
    "Continue with Google",
    "Continue with Apple",
    "I agree to the",
    "Already have an account?",
  ],
  "es-ES": ["Continuar con Google", "Continuar con Apple", "Acepto los", "¿Ya tienes cuenta?"],
};

const CHAVES_CRUAS = [
  "continueWithGoogle",
  "continueWithApple",
  "socialComingSoon",
  "socialIntegrating",
  "consentAnd",
];

const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

function semScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

async function fetchSsr(request: APIRequestContext, url: string) {
  const res = await request.get(url);
  expect(res.ok(), `${url} deveria responder 200`).toBe(true);
  return res.text();
}

// Dev (next dev/Turbopack) compila rotas sob demanda — a primeira requisição
// a uma rota fria pode demorar ou estourar. Aquece todas as rotas do gate
// antes dos testes para eliminar flakiness de compilação.
test.beforeAll(async ({ request, baseURL }) => {
  const origin = new URL(baseURL as string).origin;
  for (const locale of LOCALES) {
    for (const path of ["/register", "/catalog", "/privacy", ""]) {
      await request.get(`${origin}/${locale}${path}`).catch(() => {});
    }
  }
});

test.describe("T271 — i18n-leak no /register (HTML SSR)", () => {
  for (const locale of LOCALES) {
    test(`${locale}: conteúdo localizado, zero PT, zero chave crua, links prefixados`, async ({
      request,
      baseURL,
    }) => {
      expect(baseURL, "PLAYWRIGHT_BASE_URL deve estar definido").toBeTruthy();
      const origin = new URL(baseURL as string).origin;

      const html = await fetchSsr(request, `${origin}/${locale}/register`);
      const visivel = semScripts(html);

      for (const esperado of REGISTER_ESPERADO[locale]) {
        expect(visivel, `${locale} deveria conter '${esperado}'`).toContain(esperado);
      }

      if (locale !== "pt-BR") {
        for (const proibido of REGISTER_PT_PROIBIDOS) {
          expect(visivel, `${locale} vazou PT: '${proibido}'`).not.toContain(proibido);
        }
      }

      if (locale === "es-ES") {
        expect(visivel, "es-ES não pode ter 'Ya tienes cuenta?' sem ¿ de abertura").not.toMatch(
          /(?<!¿)Ya tienes cuenta\?/,
        );
      }

      for (const key of CHAVES_CRUAS) {
        expect(visivel, `${locale} vazou chave crua '${key}'`).not.toContain(key);
      }

      for (const path of ["/login", "/terms", "/privacy"]) {
        expect(html, `${locale} deveria ter link ${path} com prefixo de locale`).toContain(
          `href="/${locale}${path}"`,
        );
      }
    });
  }
});

const PAGINAS = ["", "/catalog", "/privacy"] as const;

const OG_LOCALE: Record<string, string> = {
  "pt-BR": "pt_BR",
  "en-US": "en_US",
  "es-ES": "es_ES",
};

const FOOTER_DADOS: Record<string, string> = {
  "pt-BR": "Seus dados",
  "en-US": "Your data",
  "es-ES": "Sus datos",
};

const NAV_ARIA: Record<string, string> = {
  "pt-BR": "Catálogo de mídias",
  "en-US": "Media catalog",
  "es-ES": "Catálogo de medios",
};

test.describe("T273 — consistência locale (home/catálogo/privacy)", () => {
  for (const locale of LOCALES) {
    test(`${locale}: og:locale underscore, rodapé sem 'LGPD' como rótulo, aria do menu localizado`, async ({
      request,
      baseURL,
    }) => {
      expect(baseURL, "PLAYWRIGHT_BASE_URL deve estar definido").toBeTruthy();
      const origin = new URL(baseURL as string).origin;

      for (const path of PAGINAS) {
        const html = await fetchSsr(request, `${origin}/${locale}${path}`);

        expect(html, `${locale}${path} og:locale deve usar underscore`).toContain(
          `property="og:locale" content="${OG_LOCALE[locale]}"`,
        );

        const rotuloDados = `href="/${locale}/user/data">${FOOTER_DADOS[locale]}</a>`;
        expect(html, `${locale}${path} rodapé deveria rotular '${FOOTER_DADOS[locale]}'`).toContain(
          rotuloDados,
        );
        if (locale !== "pt-BR") {
          expect(
            html,
            `${locale}${path} não pode ter 'LGPD' como rótulo de link no rodapé`,
          ).not.toContain(`href="/${locale}/user/data">LGPD</a>`);
        }
      }

      const home = await fetchSsr(request, `${origin}/${locale}`);
      const explorarEsperado =
        locale === "en-US" ? 'aria-label="Explore ' : 'aria-label="Explorar ';
      expect(home, `${locale} aria do menu de categorias`).toContain(explorarEsperado);
      if (locale === "en-US") {
        expect(home, "en-US não pode ter aria 'Explorar' em PT").not.toContain(
          'aria-label="Explorar ',
        );
      }
      expect(home, `${locale} nav aria do cluster`).toContain(`aria-label="${NAV_ARIA[locale]}"`);
    });

    if (locale === "es-ES") {
      test("es-ES /privacy: meta cita RGPD (não só 'LGPD')", async ({ request, baseURL }) => {
        const origin = new URL(baseURL as string).origin;
        const html = await fetchSsr(request, `${origin}/es-ES/privacy`);
        expect(html, "meta de /es-ES/privacy deve citar RGPD").toContain("RGPD");
      });
    }
  }
});
