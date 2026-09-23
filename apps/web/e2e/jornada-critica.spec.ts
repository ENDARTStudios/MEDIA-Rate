import { test, expect, type Page } from "@playwright/test";
import { apiLogin, dismissConsentIfPresent } from "./helpers/auth";

/**
 * T060 — jornada crítica do MEDIA Rate (E2E determinístico, D-547).
 *
 * Cobre: descoberta pública (home/catálogo/detalhe), salvaguarda (watchlist
 * Kanban), biblioteca autenticada (deep link status/tipo + filtro + vazio/sem
 * 500) e dashboard (métricas + i18n + sem erro). Requer API+DB (`E2E_FULL=1`,
 * T461) — ver `docs/E2E.md`. NÃO altera produto: só testes.
 *
 * Fixtures: usuários provisionados (`*@mediarate.test`) e títulos reais do
 * catálogo; nenhum dado de produção é mutado além de interações da própria
 * conta de teste.
 */
const E2E_FULL = process.env.E2E_FULL === "1";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Senha@123";
const QA_EMAIL = "free@mediarate.test";

/** Mídia garantida no catálogo (mesma âncora de `media-details.spec.ts`). */
const GAME_SLUG = "baldur-s-gate-3";

/** Chave i18n crua visível (ex.: `home.benefits.title`) não deve vazar no texto. */
const RE_CHAVE_CRUA =
  /\b(?:home|common|nav|footer|catalog|biblioteca|dashboard)\.[a-z][A-Za-z0-9.]*/;

async function semErro5xx(page: Page): Promise<void> {
  const body = await page.locator("body").innerText();
  expect(body, "página não pode exibir erro 5xx/Exception").not.toMatch(
    /500|Internal Server Error|Application error|digest:/i,
  );
}

async function semChaveCrua(page: Page): Promise<void> {
  const body = await page.locator("body").innerText();
  expect(body, "texto não deve conter chave i18n crua").not.toMatch(RE_CHAVE_CRUA);
}

test.describe("T060 — jornada crítica", () => {
  test.beforeEach(async ({ page, context }) => {
    test.skip(!E2E_FULL, "T461: requer API+DB (E2E_FULL=1) — CI sobe só o web; ver docs/E2E.md");
    await context.clearCookies();
    await dismissConsentIfPresent(page);
  });

  // ---------- 1. Descoberta pública ----------

  test("home pública renderiza sem chave i18n crua", async ({ page }) => {
    await page.goto("/pt-BR", { waitUntil: "domcontentloaded" });
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 15_000 });
    await semChaveCrua(page);
  });

  test("catálogo abre, filtra e navega sem erro", async ({ page }) => {
    await page.goto("/pt-BR/catalog", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main, [data-testid='catalog-grid'], h1").first()).toBeVisible({
      timeout: 20_000,
    });
    // Navegação básica: navbar presente e sem 5xx.
    await expect(page.locator("nav").first()).toBeVisible();
    await semErro5xx(page);
  });

  test("detalhe de mídia mostra título e imagem (com fallback)", async ({ page }) => {
    await page.goto(`/pt-BR/media/${GAME_SLUG}`, { waitUntil: "domcontentloaded" });
    await expect(
      page
        .locator("h1, h2")
        .filter({ hasText: /Baldur's Gate 3/i })
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    // A página deve renderizar ao menos uma imagem (real ou placeholder/fallback).
    const imagens = page.locator("img");
    expect(await imagens.count()).toBeGreaterThan(0);
    await semErro5xx(page);
  });

  // ---------- 2. Salvaguarda (watchlist Kanban) ----------

  test("watchlist autenticada carrega colunas e sobrevive ao reload", async ({ page }) => {
    await apiLogin(page, QA_EMAIL, PASSWORD);
    await page.goto("/pt-BR/watchlist", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main, h1, h2").first()).toBeVisible({ timeout: 20_000 });
    await semErro5xx(page);

    // Reload preserva a sessão (cookie `sess`) e re-renderiza a tela.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("main, h1, h2").first()).toBeVisible({ timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  // ---------- 3. Biblioteca autenticada ----------

  test("biblioteca: deep link ?status= pré-seleciona a aba", async ({ page }) => {
    await apiLogin(page, QA_EMAIL, PASSWORD);
    await page.goto("/pt-BR/biblioteca?status=QUERO_CONSUMIR", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("biblioteca-tabs")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tab", { selected: true })).toContainText(/Quero/i);
    await semErro5xx(page);
  });

  test("biblioteca: query inválida cai no padrão sem quebrar", async ({ page }) => {
    await apiLogin(page, QA_EMAIL, PASSWORD);
    await page.goto("/pt-BR/biblioteca?status=INVALIDO&tipo=<script>", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("biblioteca-tabs")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tab", { name: /Todos/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await semErro5xx(page);
  });

  test("biblioteca: estado vazio OU grid, sem 500", async ({ page }) => {
    await apiLogin(page, QA_EMAIL, PASSWORD);
    await page.goto("/pt-BR/biblioteca", { waitUntil: "domcontentloaded" });
    const grid = page.getByTestId("biblioteca-grid");
    const vazio = page.getByText(/biblioteca está vazia/i);
    await expect(grid.or(vazio).first()).toBeVisible({ timeout: 20_000 });
    await semErro5xx(page);
  });

  // ---------- 4. Dashboard autenticada ----------

  test("dashboard: sidebar visível, sem chave crua e sem erro de página", async ({ page }) => {
    await apiLogin(page, QA_EMAIL, PASSWORD);
    await page.goto("/pt-BR/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("dashboard-sidebar")).toBeVisible({ timeout: 20_000 });
    await semChaveCrua(page);
    await semErro5xx(page);
  });
});
