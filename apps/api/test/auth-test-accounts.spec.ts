/**
 * T184 — higiene estática das contas de teste (incidente 2026-10-11).
 *
 * Garante que: e-mails de teste ficam em domínios reservados; workflows não
 * carregam senha literal (geração efêmera em runtime); fixture de evidência
 * tem guarda de ambiente. Nenhum valor de segredo é usado neste spec.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const ler = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

const SRC_PROVISION = ler("../prisma/provision-test-users.ts");
const SRC_SEED = ler("../prisma/seed.ts");
const SRC_FIXTURE = ler("../prisma/fixtures/evidence-fixture.cjs");
const WF_CI = ler("../../../.github/workflows/ci.yml");
const WF_SMOKE = ler("../../../.github/workflows/smoke-auth.yml");

const DOMINIOS_RESERVADOS = ["@mediarate.test", "@mediarate.example"];

const emailsDe = (src: string) =>
  src.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];

describe("T184 — higiene das contas de teste", () => {
  it("provisionamento usa apenas domínios de teste", () => {
    const emails = emailsDe(SRC_PROVISION);
    expect(emails.length).toBeGreaterThan(0);
    for (const e of emails) {
      expect(DOMINIOS_RESERVADOS.some((d) => e.endsWith(d))).toBe(true);
    }
  });

  it("seed usa apenas domínios reservados", () => {
    const emails = emailsDe(SRC_SEED);
    expect(emails.length).toBeGreaterThan(0);
    for (const e of emails) {
      expect(DOMINIOS_RESERVADOS.some((d) => e.endsWith(d))).toBe(true);
    }
  });

  it("ci.yml: sem senha literal em env; geração efêmera presente", () => {
    expect(WF_CI).not.toMatch(/E2E_TEST_PASSWORD:\s*"/);
    expect(WF_CI).toMatch(/TEST_USERS_PASSWORD=\$SENHA_EFEMERA/);
    expect(WF_CI).toMatch(/E2E_TEST_PASSWORD=\$SENHA_EFEMERA/);
  });

  it("smoke-auth.yml: geração efêmera presente (sem valor em env)", () => {
    expect(WF_SMOKE).toMatch(/TEST_USERS_PASSWORD=\$SENHA_EFEMERA/);
    expect(WF_SMOKE).toMatch(/SMOKE_TEST_PASSWORD=\$SENHA_EFEMERA/);
    expect(WF_SMOKE).not.toMatch(/^\s*SMOKE_TEST_PASSWORD\s*:/m);
  });

  it("fixture de evidência: guarda de ambiente presente", () => {
    expect(SRC_FIXTURE).toContain("TEST_USERS_ALLOW_NONLOCAL");
  });
});
