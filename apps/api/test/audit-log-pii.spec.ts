import { describe, it, expect } from "vitest";
import { AuditLogService } from "../src/common/audit-log.service.js";
import { sanitizarPii, mascararIpInet } from "../src/common/pii-mask.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

/**
 * T055 — minimização de PII em NOVOS registros de AuditLog (D-545).
 *
 * Fixtures apenas com domínio `.invalid` e IPs de documentação (RFC 5737).
 */
const EMAIL_FIXTURE = "usuario@example.invalid";
const IP_FIXTURE = "203.0.113.45";

function buildPrisma() {
  const criados: Record<string, unknown>[] = [];
  const prisma = {
    auditLog: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        criados.push(data);
        return data;
      },
    },
  } as unknown as PrismaService;
  return { prisma, criados };
}

describe("T055 — sanitizarPii (unit)", () => {
  it("mascara e-mail, IP e redige chaves sensíveis recursivamente", () => {
    const entrada = {
      "email": EMAIL_FIXTURE,
      "contato": EMAIL_FIXTURE,
      "ip": IP_FIXTURE,
      "ip_origem": IP_FIXTURE,
      "senha": "s3cr3t-senha",
      "password": "p",
      "token": "tok-123",
      "cookie": "sid=abc",
      "authorization": "Bearer xyz",
      "x-csrf-token": "csrf-1",
      "user_agent": "UA/1.0 (sensivel)",
      "comentario": "texto do usuario",
      "DATABASE_URL": "conn-secreta-fixture",
      "nested": { email: EMAIL_FIXTURE, ok: 1 },
      "lista": [{ email: EMAIL_FIXTURE }],
    };
    const s = sanitizarPii(entrada) as Record<string, unknown>;
    const json = JSON.stringify(s);
    expect(json).not.toContain(EMAIL_FIXTURE);
    expect(json).not.toContain(IP_FIXTURE);
    expect(json).not.toContain("s3cr3t-senha");
    expect(json).not.toContain("tok-123");
    expect(json).not.toContain("sid=abc");
    expect(json).not.toContain("Bearer xyz");
    expect(json).not.toContain("csrf-1");
    expect(json).not.toContain("UA/1.0");
    expect(json).not.toContain("texto do usuario");
    expect(json).not.toContain("conn-secreta-fixture");
    expect((s.nested as Record<string, unknown>).ok).toBe(1);
  });

  it("mascararIpInet produz valor válido para coluna inet (não o host cru)", () => {
    expect(mascararIpInet(IP_FIXTURE)).toBe("203.0.113.0/24");
    expect(mascararIpInet(IP_FIXTURE)).not.toContain("45");
    expect(mascararIpInet("2001:db8::1")).toMatch(/^2001:db8:1::\/48$/);
    expect(mascararIpInet("")).toBeUndefined();
  });
});

describe("T055 — AuditLogService.log sanitiza o payload", () => {
  it("não persiste PII crua em dados_antes/dados_depois/ip_origem", async () => {
    const { prisma, criados } = buildPrisma();
    const svc = new AuditLogService(prisma);

    await svc.log({
      entidade: "usuario",
      entidadeId: "u-1",
      acao: "REGISTER",
      usuarioId: "u-1",
      dadosAntes: {
        email: EMAIL_FIXTURE,
        ip: IP_FIXTURE,
        senha: "s3cr3t-senha",
        token: "tok-123",
        cookie: "sid=abc",
        authorization: "Bearer xyz",
      },
      dadosDepois: {
        nome: "Fulano",
        user_agent: "UA/1.0 (sensivel)",
        comentario: "texto do usuario",
        contato: EMAIL_FIXTURE,
      },
      ipOrigem: IP_FIXTURE,
    });

    const persistido = JSON.stringify(criados[0]);
    expect(persistido).not.toContain(EMAIL_FIXTURE);
    expect(persistido).not.toContain(IP_FIXTURE);
    expect(persistido).not.toContain("s3cr3t-senha");
    expect(persistido).not.toContain("tok-123");
    expect(persistido).not.toContain("sid=abc");
    expect(persistido).not.toContain("Bearer xyz");
    expect(persistido).not.toContain("UA/1.0");
    expect(persistido).not.toContain("texto do usuario");
    expect(criados[0]?.ip_origem).toBe("203.0.113.0/24");
  });
});
