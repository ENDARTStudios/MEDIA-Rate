import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Logger } from "@nestjs/common";
import { mascararEmail, mascararIp } from "../src/common/pii-mask.js";
import { LockoutService } from "../src/modules/auth/lockout.service.js";

/**
 * T049 — regressão de PII em logs de auth (D-543).
 *
 * Garante que e-mail (e IP) NÃO apareçam em claro nas mensagens de log do
 * módulo auth. Usa apenas fixture com domínio `.invalid` (RFC 2606).
 */
const EMAIL_FIXTURE = "usuario@example.invalid";
const IP_FIXTURE = "203.0.113.45";

describe("T049 — mascaramento de PII (email/IP)", () => {
  it("mascararEmail remove o valor cru e preserva só o TLD", () => {
    const m = mascararEmail(EMAIL_FIXTURE);
    expect(m).not.toContain("usuario");
    expect(m).not.toContain("example");
    expect(m).toMatch(/@\*+\.invalid$/);
    expect(m).toContain("***");
  });

  it("mascararEmail é resiliente a valores vazios/inválidos", () => {
    expect(mascararEmail("")).toBe("***");
    expect(mascararEmail("sem-arroba")).toBe("***");
  });

  it("mascararIp preserva só o prefixo de rede", () => {
    expect(mascararIp(IP_FIXTURE)).toBe("203.0.x.x");
    expect(mascararIp(IP_FIXTURE)).not.toContain("113");
    expect(mascararIp("2001:db8::1")).toBe("2001:db8:*");
    expect(mascararIp(undefined)).toBe("unknown");
  });
});

describe("T049 — logs de lockout não expõem PII", () => {
  afterEach(() => vi.restoreAllMocks());

  it("o log de lockout não contém o e-mail nem o IP brutos", async () => {
    const capturadas: string[] = [];
    const spy = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation((msg: unknown) => void capturadas.push(String(msg)));

    const svc = new LockoutService();
    for (let i = 0; i < 6; i++) {
      await svc.registerFailure(IP_FIXTURE, EMAIL_FIXTURE);
    }
    spy.mockRestore();

    const logs = capturadas.join("\n");
    expect(logs.length).toBeGreaterThan(0);
    expect(logs).not.toContain(EMAIL_FIXTURE);
    expect(logs).not.toContain("usuario");
    expect(logs).not.toContain(IP_FIXTURE);
  });
});

describe("T049 — guarda de fonte: nenhum log cru de email no módulo auth", () => {
  it("auth.service.ts e lockout.service.ts não interpolam email cru em logger", () => {
    const arquivos = ["auth.service.ts", "lockout.service.ts", "email-verification.service.ts"];
    const brutoEmail = /\$\{(?:dto\.)?email\b/i;
    const brutoKey = /\$\{\s*k\s*\}/;
    for (const nome of arquivos) {
      const src = readFileSync(
        fileURLToPath(new URL(`../src/modules/auth/${nome}`, import.meta.url)),
        "utf8",
      );
      const linhasDeLog = src.split("\n").filter((l) => /logger\.(log|warn|error|debug)\(/.test(l));
      for (const linha of linhasDeLog) {
        expect(brutoEmail.test(linha), `${nome}: ${linha}`).toBe(false);
        expect(brutoKey.test(linha), `${nome}: ${linha}`).toBe(false);
      }
    }
  });
});
