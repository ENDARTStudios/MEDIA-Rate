import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * T302 — gates de compliance do security-gate §10:
 * 1) HSTS: helmet da API garante Strict-Transport-Security max-age >= 31536000.
 * 2) Compliance legal: /privacy cita LGPD (pt-BR) e RGPD+AEPD (es-ES) —
 *    o e2e i18n-leak já verifica o SSR; aqui cobre a fonte (messages).
 * 3) Matriz: CURATOR não tem acesso a /admin/* (metadata da curadoria exige
 *    ADMIN; cobertura real em test/curadoria.e2e.spec.ts).
 */
describe("T302 — compliance gates (HSTS + legal + matriz)", () => {
  it("HSTS: helmet da API configura max-age >= 31536000 (1 ano)", () => {
    const cfg = readFileSync("apps/api/src/common/security.config.ts", "utf8");
    const m = cfg.match(/maxAge[:\s]+(\d+)/i);
    expect(m, "security.config.ts deve definir hsts.maxAge").toBeTruthy();
    if (m) expect(parseInt(m[1], 10)).toBeGreaterThanOrEqual(31536000);
  });

  it("compliance legal: /pt-BR/privacy cita LGPD na fonte", () => {
    const pt = JSON.parse(readFileSync("apps/web/src/messages/pt-BR.json", "utf8"));
    const body = JSON.stringify(pt.privacy ?? {});
    expect(body).toMatch(/LGPD/i);
  });

  it("compliance legal: /es-ES/privacy cita RGPD e AEPD na fonte", () => {
    const es = JSON.parse(readFileSync("apps/web/src/messages/es-ES.json", "utf8"));
    const body = JSON.stringify(es.privacy ?? {});
    expect(body).toMatch(/RGPD/i);
    expect(body).toMatch(/AEPD/i);
  });

  it("matriz: endpoints de curadoria exigem CURATOR/ADMIN (CURATOR ≠ ADMIN para /admin/*)", () => {
    const controller = readFileSync(
      "apps/api/src/modules/curadoria/curadoria.controller.ts",
      "utf8",
    );
    expect(controller).toMatch(/@Roles\("CURATOR", "ADMIN"\)/);
    // As rotas /admin/* (flags, stats) são protegidas por @Roles('ADMIN') no
    // AdminModule/FeatureFlagsModule — cobertura e2e em curadoria.e2e.spec.ts.
    const flags = readFileSync("apps/api/src/modules/flags/feature-flags.controller.ts", "utf8");
    expect(flags).toMatch(/@Roles\("ADMIN"\)/);
  });
});
