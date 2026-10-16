import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * D-588 (T211/M1) — axe AA nas telas de ADMIN.
 *
 * Contexto da auditoria: nenhum gate cobria `/admin` — nem o harness visual
 * (`design:visual` só visitava a home), nem o axe de CI (`e2e/a11y.spec.ts` não
 * tinha nenhuma rota `/admin`), nem o teste de contraste (que audita tokens, não
 * as classes do admin). Foi por isso que uma regressão de tema claro sobre fundo
 * escuro (`dark:` respondendo ao SO, D-582.1) passou verde meses.
 *
 * Este spec roda com sessão real (ver `playwright.auth.config.ts`) e com o SO em
 * modo claro — o cenário que quebrava.
 */

const TELAS_ADMIN = [
  { rota: "/pt-BR/admin", nome: "visão geral" },
  { rota: "/pt-BR/admin/usuarios", nome: "usuários" },
  { rota: "/pt-BR/admin/catalogo", nome: "catálogo" },
  { rota: "/pt-BR/admin/metricas", nome: "métricas" },
  { rota: "/pt-BR/admin/auditoria", nome: "auditoria" },
  { rota: "/pt-BR/admin/lgpd", nome: "LGPD" },
  { rota: "/pt-BR/admin/diagnostics", nome: "diagnostics" },
  { rota: "/pt-BR/admin/upload", nome: "upload" },
];

/** Impactos que reprovam (o resto fica no relatório como dívida visível). */
const BLOQUEIA = new Set(["critical", "serious"]);

test.describe("admin — acessibilidade AA (axe)", () => {
  for (const { rota, nome } of TELAS_ADMIN) {
    test(`${nome} (${rota})`, async ({ page }) => {
      await page.goto(rota, { waitUntil: "domcontentloaded" });
      // Dados carregam no cliente: dá tempo das tabelas/KPIs assentarem.
      await page.waitForTimeout(2500);

      // Sanidade: se a sessão não valeu, o middleware manda para /login — falhar
      // aqui é melhor do que auditar a página errada.
      expect(page.url(), `sessão não autenticada em ${rota}`).not.toContain("/login");

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const bloqueantes = violations.filter((v) => BLOQUEIA.has(v.impact ?? ""));
      const detalhe = bloqueantes
        .map(
          (v) =>
            `- [${v.impact}] ${v.id}: ${v.help}\n` +
            v.nodes
              .slice(0, 3)
              .map((n) => `    ${n.target.join(" ")}`)
              .join("\n"),
        )
        .join("\n");

      // Dívida conhecida (não bloqueia) sai no log para triagem sem virar gate.
      const leves = violations.filter((v) => !BLOQUEIA.has(v.impact ?? ""));
      if (leves.length) {
        console.log(
          `[${nome}] dívida não bloqueante: ` +
            leves.map((v) => `${v.id}(${v.impact}, ${v.nodes.length})`).join(", "),
        );
      }

      expect(bloqueantes, `violações críticas/sérias em ${rota}:\n${detalhe}`).toEqual([]);
    });
  }
});

test.describe("admin — tema e contraste reais (D-582.1)", () => {
  test("cards e textos do admin usam a paleta escura mesmo com SO em modo claro", async ({
    page,
  }) => {
    await page.goto("/pt-BR/admin/usuarios", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const amostra = await page.evaluate(() => {
      const fundo = getComputedStyle(document.body).backgroundColor;
      // pega o primeiro container com classe de superfície/card
      const candidato = document.querySelector(
        "main div[class*='bg-'], main table[class*='bg-'], main div[class*='card']",
      ) as HTMLElement | null;
      const estilo = candidato ? getComputedStyle(candidato) : null;
      return {
        fundo,
        card: estilo?.backgroundColor ?? "n/a",
        texto: estilo?.color ?? "n/a",
      };
    });

    // rgb(255,255,255) aqui = o bug de light-mode-first voltando.
    expect(amostra.card, `card branco no admin (fundo=${amostra.fundo})`).not.toBe(
      "rgb(255, 255, 255)",
    );
  });
});
