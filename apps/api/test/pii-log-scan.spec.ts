import { describe, it, expect, vi, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Logger } from "@nestjs/common";
import { MockMailService } from "../src/common/mock-mail.service.js";
import type { MailerService } from "../src/modules/mailer/mailer.service.js";

/**
 * T053 — varredura de PII em logs FORA do módulo auth (D-544).
 *
 * Complementa `auth-pii-log.spec.ts`: garante que nenhum `logger.*`/`console.*`
 * em `apps/api/src` interpole e-mail/IP/comentário **sem mascarar**
 * (`mascararEmail`/`mascararIp`). Fixture apenas com domínio `.invalid`.
 */
const EMAIL_FIXTURE = "usuario@example.invalid";
const SRC = fileURLToPath(new URL("../src", import.meta.url));

function arquivosTs(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...arquivosTs(p));
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

const PII = /(email|user_agent|userAgent|comentario|telefone|ip_origem|ipOrigem|ip_aceite)/i;

describe("T053 — varredura de PII em logs (src inteiro)", () => {
  it("nenhum log em apps/api/src interpola PII crua (sem mascarar)", () => {
    const violacoes: string[] = [];
    for (const f of arquivosTs(SRC)) {
      if (f.endsWith("pii-mask.ts")) continue;
      const src = readFileSync(f, "utf8");
      const re = /\$\{([^}]*)\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const conteudo = m[1] ?? "";
        if (!PII.test(conteudo) || /mascarar/.test(conteudo)) continue;
        const antes = src.slice(Math.max(0, m.index - 250), m.index);
        const idx = Math.max(antes.lastIndexOf("logger."), antes.lastIndexOf("console."));
        if (idx >= 0 && !antes.slice(idx).includes(";")) {
          violacoes.push(`${f.split("\\").slice(-2).join("/")} -> ${m[0]}`);
        }
      }
    }
    expect(violacoes, violacoes.join("\n")).toEqual([]);
  });
});

describe("T053 — MockMailService não loga e-mail cru", () => {
  afterEach(() => vi.restoreAllMocks());

  it("enviarResetSenha/enviarVerificacaoEmail mascaram o destinatário", async () => {
    const capturadas: string[] = [];
    const spy = vi
      .spyOn(Logger.prototype, "debug")
      .mockImplementation((msg: unknown) => void capturadas.push(String(msg)));

    const mailer = { enviar: vi.fn(async () => undefined) } as unknown as MailerService;
    const svc = new MockMailService(mailer);
    await svc.enviarResetSenha(EMAIL_FIXTURE, "token-fixture");
    await svc.enviarVerificacaoEmail(EMAIL_FIXTURE, "token-fixture", { link: "x", lang: "pt" });
    spy.mockRestore();

    const logs = capturadas.join("\n");
    expect(logs.length).toBeGreaterThan(0);
    expect(logs).not.toContain(EMAIL_FIXTURE);
    expect(logs).not.toContain("usuario");
    expect(logs).not.toContain("token-fixture");
  });
});
