import { test, expect, type Page } from "@playwright/test";

/**
 * D-587 (T211) — gate de HIDRATAÇÃO e de conteúdo invisível.
 *
 * Por que existe: dois defeitos reais chegaram na `main` sem nenhum gate ver —
 * (1) `whileTap`/`whileHover` condicionados a `prefers-reduced-motion` faziam o
 * motion injetar `tabindex="0"` no servidor e não no cliente (hydration mismatch
 * em TODA grade de cards); (2) `initial={shouldReduce ? false : { opacity: 0 }}`
 * fazia o HTML servido nascer invisível (e hidratar diferente). Nenhum teste do
 * repo rodava com `reducedMotion: "reduce"`.
 *
 * O que valida, por rota pública e nos DOIS modos de movimento:
 *  - nenhuma mensagem de hydration mismatch (React) no console;
 *  - nenhum erro de console/`pageerror` inesperado;
 *  - nenhum bloco de texto com `opacity < 0.05` depois das animações assentarem
 *    (conteúdo invisível = tela em branco para quem tem JS lento ou desligado).
 *
 * Uso: `npm run test:hydration --workspace apps/web` (exige dev server, que o
 * config reaproveita ou sobe). Não entra no CI: depende do dev server e o custo
 * é de segundos por rota.
 */

const ROTAS_PUBLICAS = [
  "/pt-BR",
  // /apoie entra na lista porque é a única página pública com ilha client que lê
  // `window` (o `SupportCta` monta o link absoluto da lista no efeito): se a
  // hidratação divergir, é aqui que aparece.
  "/pt-BR/apoie",
  "/pt-BR/welcome",
  "/pt-BR/about",
  "/pt-BR/faq",
  "/pt-BR/pricing",
  "/pt-BR/catalog",
  "/pt-BR/discover",
  "/pt-BR/top",
  "/pt-BR/sources",
  "/pt-BR/methodology",
  "/pt-BR/terms",
  "/pt-BR/privacy",
  "/pt-BR/verificar-email",
  "/pt-BR/billing/success",
  "/pt-BR/login",
  "/pt-BR/register",
  "/en-US/sources",
  "/es-ES/methodology",
];

/** Mensagens benignas do ambiente de desenvolvimento. */
const IGNORAR = [
  /Download the React DevTools/i,
  /\[HMR\]/i,
  /\[Fast Refresh\]/i,
  /Failed to load resource/i,
];

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on("console", (m) => {
    const texto = m.text();
    if (IGNORAR.some((r) => r.test(texto))) return;
    if (/hydrat|didn't match|did not match/i.test(texto)) erros.push(`HYDRATION: ${texto}`);
    else if (m.type() === "error") erros.push(`console: ${texto}`);
  });
  page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
  return erros;
}

async function contarInvisiveis(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const alvos = Array.from(document.querySelectorAll("h1, h2, h3, p, a, li, button"));
    return alvos
      .filter((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        // ignora o que está fora do viewport (não foi revelado ainda por design)
        const visivelNaDobra = r.top < window.innerHeight && r.bottom > 0;
        return visivelNaDobra && r.width > 0 && r.height > 0 && Number(s.opacity) < 0.05;
      })
      .slice(0, 3)
      .map((el) => `${el.tagName}.${(el.className || "").toString().slice(0, 60)}`);
  });
}

test.describe("hidratação e conteúdo visível (D-587)", () => {
  // O sweep é semântico (hidratação/opacidade), não visual: rodar só no desktop
  // evita duplicar 36 navegações no projeto mobile.
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop-1440", "sweep roda apenas no desktop");
  });
  for (const rota of ROTAS_PUBLICAS) {
    for (const movimento of ["reduce", "no-preference"] as const) {
      test(`${rota} [reducedMotion=${movimento}]`, async ({ page, browser }) => {
        // `emulateMedia` no contexto garante que o PRIMEIRO render do cliente já
        // conheça a preferência — é exatamente o cenário que quebrava.
        const contexto = await browser.newContext({
          reducedMotion: movimento === "reduce" ? "reduce" : "no-preference",
          viewport: page.viewportSize() ?? { width: 1440, height: 900 },
        });
        const pagina = await contexto.newPage();
        const erros = coletarErros(pagina);
        await pagina.goto(rota, { waitUntil: "domcontentloaded" });
        // espera as animações de entrada assentarem antes de medir opacidade
        await pagina.waitForTimeout(2500);
        const invisiveis = await contarInvisiveis(pagina);
        await contexto.close();

        expect(erros, `erros de console em ${rota} (${movimento}):\n${erros.join("\n")}`).toEqual(
          [],
        );
        expect(invisiveis, `conteúdo invisível em ${rota} (${movimento})`).toEqual([]);
      });
    }
  }
});
