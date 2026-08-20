/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";
import { EmailVerificationService } from "../src/modules/auth/email-verification.service.js";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

function makeMocks() {
  const usuarios = new Map<string, Record<string, unknown>>();
  const auditLog = { log: vi.fn(async () => undefined) };
  const mail = { enviarVerificacaoEmail: vi.fn(async () => undefined) };
  const prisma = {
    usuario: {
      findUnique: async ({ where }: any) => usuarios.get(where.email) ?? null,
      findFirst: async ({ where }: any) =>
        [...usuarios.values()].find((u) => {
          if (u.email_verification_token_hash !== where.email_verification_token_hash) {
            return false;
          }
          const exp = where.email_verification_expira_em;
          if (exp && "gt" in exp && exp.gt) {
            return (
              u.email_verification_expira_em != null &&
              new Date(u.email_verification_expira_em as Date) > new Date(exp.gt as Date)
            );
          }
          return true;
        }) ?? null,
      update: async ({ where, data }: any) => {
        const u = [...usuarios.values()].find((x) => x.id === where.id);
        if (u) Object.assign(u, data);
        return u;
      },
    },
  };
  const service = new EmailVerificationService(prisma as any, auditLog as any, mail as any);
  return { service, prisma, usuarios, auditLog, mail };
}

describe("EmailVerificationService (T214)", () => {
  let m: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    m = makeMocks();
  });

  it("emitirToken: armazena SHA-256 + expira em 24h e entrega o raw no mail", async () => {
    m.usuarios.set("user@test.com", { id: "u1", email: "user@test.com" });
    const raw = await m.service.emitirToken({ id: "u1", email: "user@test.com" });
    const u = m.usuarios.get("user@test.com")!;
    expect(u.email_verification_token_hash).toBe(hash(raw));
    expect(u.email_verification_token_hash).not.toBe(raw);
    // T376: email agora leva link + lang (código como fallback).
    expect(m.mail.enviarVerificacaoEmail).toHaveBeenCalledWith(
      "user@test.com",
      raw,
      expect.objectContaining({
        link: expect.stringContaining("/pt-BR/verificar-email?token="),
        lang: "pt",
      }),
    );
    const expira = u.email_verification_expira_em as Date;
    expect(expira.getTime() - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
  });

  it("verificar: token válido marca email_verificado_em e anula (uso único) + audit", async () => {
    const raw = m.service.generateToken();
    m.usuarios.set("user@test.com", {
      id: "u1",
      email: "user@test.com",
      email_verification_token_hash: hash(raw),
      email_verification_expira_em: new Date(Date.now() + 60_000),
      email_verificado_em: null,
    });
    const r1 = await m.service.verificar(raw, { ip: "1.2.3.4", user_agent: "ua" });
    expect(r1.ok).toBe(true);
    const u = m.usuarios.get("user@test.com")!;
    expect(u.email_verificado_em).toBeInstanceOf(Date);
    expect(u.email_verification_token_hash).toBeNull(); // uso único
    expect(m.auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "EMAIL_VERIFIED", ipOrigem: "1.2.3.4" }),
    );
    // Segundo uso do mesmo token → falha (token anulado).
    const r2 = await m.service.verificar(raw);
    expect(r2.ok).toBe(false);
  });

  it("verificar: token inválido ou expirado → ok false (sem revelar)", async () => {
    const raw = m.service.generateToken();
    m.usuarios.set("user@test.com", {
      id: "u1",
      email: "user@test.com",
      email_verification_token_hash: hash(raw),
      email_verification_expira_em: new Date(Date.now() - 1000), // expirado
      email_verificado_em: null,
    });
    expect((await m.service.verificar(raw)).ok).toBe(false);
    expect((await m.service.verificar("token-desconhecido")).ok).toBe(false);
    expect((await m.service.verificar("")).ok).toBe(false);
  });

  it("reenviar: rate limit 3/h por email — a 4ª solicitação lança 429", async () => {
    m.usuarios.set("user@test.com", {
      id: "u1",
      email: "user@test.com",
      email_verificado_em: null,
    });
    for (let i = 0; i < 3; i++) {
      await m.service.reenviar("user@test.com", {});
    }
    await expect(m.service.reenviar("user@test.com", {})).rejects.toMatchObject({
      status: 429,
    });
    // Emails diferentes têm cotas separadas.
    await expect(m.service.reenviar("outro@test.com", {})).resolves.toBeDefined();
  });

  it("reenviar: email inexistente ou já verificado → resposta genérica (sem enumeração)", async () => {
    m.usuarios.set("verificado@test.com", {
      id: "u2",
      email: "verificado@test.com",
      email_verificado_em: new Date(),
    });
    const inexistente = await m.service.reenviar("ninguem@test.com", {});
    const verificado = await m.service.reenviar("verificado@test.com", {});
    expect(inexistente.message).toContain("Se o email estiver cadastrado");
    expect(verificado.message).toContain("Se o email estiver cadastrado");
    expect(m.mail.enviarVerificacaoEmail).not.toHaveBeenCalled();
  });

  it("reenviar: usuário não verificado emite novo token + audit EMAIL_VERIFICATION_RESENT", async () => {
    m.usuarios.set("user@test.com", {
      id: "u1",
      email: "user@test.com",
      email_verificado_em: null,
    });
    await m.service.reenviar("user@test.com", { ip: "1.2.3.4", user_agent: "ua" });
    expect(m.mail.enviarVerificacaoEmail).toHaveBeenCalledTimes(1);
    expect(m.auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ acao: "EMAIL_VERIFICATION_RESENT" }),
    );
  });
});
