import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { ACCOUNT_ITEMS, NAV_ITEMS } from "@/components/dashboard/DashboardSidebar";

/**
 * T460 (Thinker — "promessa morta é link morto"): toda href usada pela
 * dashboard (sidebar, atalhos e cards de descoberta) precisa existir como
 * página no App Router. Validado contra o filesystem, não "no olho".
 */

const APP_DIR = path.resolve(process.cwd(), "src/app/[locale]");

/** href → arquivo de página esperado dentro de src/app/[locale]. */
const ROTAS_EXISTENTES: Record<string, string> = {
  "/dashboard": "dashboard/page.tsx",
  "/dashboard/discoveries": "dashboard/discoveries/page.tsx",
  "/biblioteca": "biblioteca/page.tsx",
  "/watchlist": "watchlist/page.tsx",
  "/historico": "historico/page.tsx",
  "/listas": "listas/page.tsx",
  "/catalog": "catalog/page.tsx",
  // UAT-40: itens de conta da sidebar.
  "/profile": "profile/page.tsx",
  "/settings": "settings/page.tsx",
  "/feedback": "feedback/page.tsx",
};

const ROTAS_DINAMICAS: Record<string, string> = {
  // Cards de descoberta reais apontam para /media/<id> (rota dinâmica).
  "/media/:slug": "media/[slug]/page.tsx",
};

describe("mapa de rotas da dashboard (T460)", () => {
  it("toda href da sidebar (navegação + conta) existe como página", () => {
    const hrefs = [...NAV_ITEMS.map((i) => i.href), ...ACCOUNT_ITEMS.map((i) => i.href)];
    expect(hrefs.length).toBeGreaterThanOrEqual(9);
    for (const href of hrefs) {
      const pagina = ROTAS_EXISTENTES[href];
      expect(pagina, `href sem entrada no mapa: ${href}`).toBeTruthy();
      expect(existsSync(path.join(APP_DIR, pagina)), `página ausente: ${href}`).toBe(true);
    }
  });

  it("rotas dos cards de descoberta (demo → /catalog, reais → /media/[slug]) existem", () => {
    for (const pagina of Object.values(ROTAS_DINAMICAS)) {
      expect(existsSync(path.join(APP_DIR, pagina))).toBe(true);
    }
  });
});
