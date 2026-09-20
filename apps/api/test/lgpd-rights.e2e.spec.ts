/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import cookie from "@fastify/cookie";
import { LgpdModule } from "../src/modules/lgpd/lgpd.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { SessionService } from "../src/modules/auth/session.service.js";
import { SessionCookieService } from "../src/modules/auth/session-cookie.service.js";
import { AuthGuard } from "../src/common/guards/auth.guard.js";
import { CsrfGuard } from "../src/common/guards/csrf.guard.js";
import { applySecurityToAdapter } from "./helpers/apply-security.js";

/**
 * T473 (D-536) — evidência EXECUTÁVEL dos direitos LGPD nos endpoints
 * /api/v1/user/data (auditoria 2026-09-04, P1: 'endpoints /user/data devem
 * ter autenticação, protocolo, rate limiting, prazo, resultado verificável
 * e tratamento de legal hold').
 *
 * Stack HTTP real (Nest+Fastify+supertest) com guards REAIS (AuthGuard +
 * CsrfGuard globais, como em app.module) e Prisma/SessionService mockados
 * (padrão dos e2e do repo). Legal hold é procedimento manual — verificado
 * no runbook docs/PRIVACY_RIGHTS_RUNBOOK.md, não por HTTP.
 */

const USER_ID = "11111111-1111-1111-1111-111111111111";
const CSRF = "csrf-t473";

/** Estado do usuário semeado (viagem completa do titular). */
const agora = () => new Date();

function criarEstado() {
  return {
    usuario: {
      id: USER_ID,
      email: "titular@mediarate.test",
      nome: "Titular de Teste",
      email_verificado_em: agora(),
      termos_aceitos_em: agora(),
      ultimo_login_em: agora(),
      created_at: agora(),
      updated_at: agora(),
      dados_para_exclusao_at: null as Date | null,
    },
    /** token -> sessão; revogação de TODAS é aferida pelo validateToken real. */
    sessoes: new Map<
      string,
      {
        id: string;
        usuario_id: string;
        revoked: boolean;
        expires_at: Date;
        user_agent: string;
        ip_criacao: string;
        created_at: Date;
      }
    >(),
  };
}

function criarPrismaMock(estado: ReturnType<typeof criarEstado>) {
  const sessaoAtiva = () => [...estado.sessoes.values()].filter((s) => !s.revoked);
  return {
    // SEM $transaction: comContextoRls executa direto (fallback documentado).
    usuario: {
      findUnique: async ({ where }: any) => (where?.id === USER_ID ? { ...estado.usuario } : null),
      update: async ({ where, data }: any) => {
        if (where?.id !== USER_ID) throw new Error("usuario errado");
        Object.assign(estado.usuario, data);
        return { ...estado.usuario };
      },
      updateMany: async ({ where, data }: any) => {
        if (where?.id !== USER_ID || data?.dados_para_exclusao_at !== null) {
          throw new Error("updateMany inesperado");
        }
        // Fidelidade ao driver (D-447): count reflete o WHERE — sem exclusão
        // pendente, nenhuma linha é tocada (cancelado: false vem daqui).
        const count = estado.usuario.dados_para_exclusao_at !== null ? 1 : 0;
        if (count === 1) estado.usuario.dados_para_exclusao_at = null;
        return { count };
      },
    },
    usuarioPapel: {
      findMany: async () => [{ usuario_id: USER_ID, papel: { nome: "USER" } }],
    },
    usuarioPlano: {
      findUnique: async ({ where }: any) =>
        where?.usuario_id === USER_ID
          ? { plano: "FREE", status: "ATIVO", current_period_end: null, created_at: agora() }
          : null,
    },
    consentimentoUsuario: {
      findMany: async () => [
        {
          finalidade: "analytics",
          consentido_em: agora(),
          revogado_em: null,
          texto_versao: "v1",
          ip_aceite: null,
        },
      ],
    },
    watchlistEntry: { findMany: async () => [{ usuario_id: USER_ID, midia_id: "m-1" }] },
    usuarioMidiaInteracao: {
      findMany: async () => [
        { usuario_id: USER_ID, status: "CONCLUIDO", midia: { id: "m-1", titulo: "Obra Teste" } },
      ],
    },
    preferenciaUsuario: {
      findUnique: async ({ where }: any) =>
        where?.usuario_id === USER_ID ? { versao: 1, updated_at: agora() } : null,
    },
    sessao: {
      findMany: async () =>
        sessaoAtiva().map((s) => ({
          id: s.id,
          user_agent: s.user_agent,
          ip_criacao: s.ip_criacao,
          expires_at: s.expires_at,
          created_at: s.created_at,
        })),
      updateMany: async ({ where, data }: any) => {
        if (where?.usuario_id !== USER_ID || !data?.revoked_at) {
          throw new Error("sessao.updateMany inesperado");
        }
        for (const s of estado.sessoes.values()) s.revoked = true;
        return { count: estado.sessoes.size };
      },
    },
    eventoPagamento: {
      findMany: async () => [{ tipo: "trial_start", processado_em: agora(), resultado: "ok" }],
    },
  };
}

function criarSessionMock(estado: ReturnType<typeof criarEstado>) {
  return {
    validateToken: async (token: string) => {
      const sess = estado.sessoes.get(token);
      if (!sess || sess.revoked) return null;
      return {
        sessao: { id: sess.id, usuario_id: USER_ID, expires_at: sess.expires_at },
        usuario: { id: USER_ID, email: estado.usuario.email, nome: estado.usuario.nome },
        renovada: false,
      };
    },
  };
}

/** Monta a app com guards REAIS globais (como app.module) + providers mockados. */
async function montarAppDireitos(
  estado: ReturnType<typeof criarEstado>,
  opcoes: { apiPerMinute?: number } = {},
): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [LgpdModule],
    providers: [
      { provide: APP_GUARD, useClass: AuthGuard },
      { provide: APP_GUARD, useClass: CsrfGuard },
      { provide: SessionService, useValue: criarSessionMock(estado) },
      { provide: SessionCookieService, useValue: { renovarSessionCookie: () => undefined } },
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(criarPrismaMock(estado))
    .compile();
  const adapter = new FastifyAdapter({ logger: false });
  await adapter.register(cookie as any, { secret: "test-secret", hook: "onRequest" });
  const app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
  await applySecurityToAdapter(adapter, {
    isProduction: false,
    allowedOrigins: ["http://localhost:3000"],
    ...(opcoes.apiPerMinute ? { apiPerMinute: opcoes.apiPerMinute } : {}),
  });
  await app.init();
  await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  return app;
}

describe("T473 — direitos do titular: /api/v1/user/data (HTTP, guards reais)", () => {
  let app: NestFastifyApplication;
  let estado: ReturnType<typeof criarEstado>;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    estado = criarEstado();
    // Duas sessões ativas: a revogação na exclusão precisa matar TODAS.
    estado.sessoes.set("t-ativo-1", {
      id: "s1",
      usuario_id: USER_ID,
      revoked: false,
      expires_at: new Date(Date.now() + 3600_000),
      user_agent: "test-agent",
      ip_criacao: "127.0.0.1",
      created_at: new Date(),
    });
    estado.sessoes.set("t-ativo-2", {
      id: "s2",
      usuario_id: USER_ID,
      revoked: false,
      expires_at: new Date(Date.now() + 3600_000),
      user_agent: "test-agent-2",
      ip_criacao: "127.0.0.1",
      created_at: new Date(),
    });
    app = await montarAppDireitos(estado);
  }, 60_000);

  afterAll(async () => {
    if (app) await app.close().catch(() => undefined);
  });

  const cookiesSessao = (token: string) => `sess=${token}; csrf_token=${CSRF}`;

  it("GET sem sessão → 401 (endpoint autenticado)", async () => {
    const r = await request(app.getHttpServer()).get("/api/v1/user/data");
    expect(r.status).toBe(401);
    expect(r.body.statusCode).toBe(401);
  });

  it("GET com cookie de sessão inválido → 401", async () => {
    const r = await request(app.getHttpServer())
      .get("/api/v1/user/data")
      .set("Cookie", "sess=token-invalido");
    expect(r.status).toBe(401);
  });

  it("GET com sessão válida → 200 com TODAS as relações do titular", async () => {
    const r = await request(app.getHttpServer())
      .get("/api/v1/user/data")
      .set("Cookie", "sess=t-ativo-1");
    expect(r.status).toBe(200);
    expect(r.body.usuario_id).toBe(USER_ID);
    expect(typeof r.body.gerado_em).toBe("string");
    for (const relacao of [
      "perfil",
      "papeis",
      "plano",
      "consentimentos",
      "watchlist",
      "interacoes",
      "preferencias",
      "sessoes_ativas",
      "eventos_pagamento",
    ]) {
      expect(r.body.dados, `dados.${relacao}`).toHaveProperty(relacao);
    }
    // D-447: serialização da resposta completa não pode lançar (pega 500 de
    // serialização sem precisar de produção).
    expect(() => JSON.stringify(r.body)).not.toThrow();
    // Sem PII financeira no plano (stripe_subscription_id excluído).
    expect(JSON.stringify(r.body.dados.plano)).not.toContain("stripe");
  });

  it("protocolo verificável: header X-Request-Id + correlation_id no corpo (200)", async () => {
    const r = await request(app.getHttpServer())
      .get("/api/v1/user/data")
      .set("Cookie", "sess=t-ativo-1");
    expect(r.status).toBe(200);
    const header = String(r.headers["x-request-id"] ?? "");
    expect(header.length, "X-Request-Id presente").toBeGreaterThan(0);
    expect(r.body.correlation_id).toBe(header);
  });

  it("DELETE com sessão+CSRF → 202: carência de 30 dias, protocolo e revogação de TODAS as sessões", async () => {
    const antes = Date.now();
    const r = await request(app.getHttpServer())
      .delete("/api/v1/user/data")
      .set("Cookie", cookiesSessao("t-ativo-1"))
      .set("x-csrf-token", CSRF)
      .send({ motivo: "teste-t473" });
    expect(r.status).toBe(202);
    // Prazo verificável: agendado_para ≈ agora + 30 dias (tolerância 1h).
    const agendado = new Date(r.body.agendado_para).getTime();
    const trintaDias = 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(agendado - (antes + trintaDias))).toBeLessThan(60 * 60 * 1000);
    expect(r.body.dias_para_cancelar).toBe(30);
    expect(String(r.headers["x-request-id"] ?? "").length).toBeGreaterThan(0);
    expect(r.body.correlation_id).toBe(String(r.headers["x-request-id"]));
    // Revogação imediata de TODAS as sessões (a outra sessão também morre).
    const r2 = await request(app.getHttpServer())
      .get("/api/v1/user/data")
      .set("Cookie", "sess=t-ativo-2");
    expect(r2.status).toBe(401);
  });

  it("DELETE duplicado → 409 (exclusão já agendada)", async () => {
    // Re-login: login NÃO é bloqueado para exclusão pendente (ver auth.service)
    // — sem isso o cancelamento seria inalcançável.
    estado.sessoes.set("t-relogin", {
      id: "s3",
      usuario_id: USER_ID,
      revoked: false,
      expires_at: new Date(Date.now() + 3600_000),
      user_agent: "relogin",
      ip_criacao: "127.0.0.1",
      created_at: new Date(),
    });
    const r = await request(app.getHttpServer())
      .delete("/api/v1/user/data")
      .set("Cookie", cookiesSessao("t-relogin"))
      .set("x-csrf-token", CSRF)
      .send({});
    expect(r.status).toBe(409);
  });

  it("POST cancel-exclusion (com CSRF) → 200 restaura a conta dentro da carência", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/user/data/cancel-exclusion")
      .set("Cookie", cookiesSessao("t-relogin"))
      .set("x-csrf-token", CSRF)
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.cancelado).toBe(true);
    expect(String(r.headers["x-request-id"] ?? "").length).toBeGreaterThan(0);
    expect(r.body.correlation_id).toBe(String(r.headers["x-request-id"]));
    // Conta restaurada: exportação volta a funcionar com a sessão pós-relogin.
    const r2 = await request(app.getHttpServer())
      .get("/api/v1/user/data")
      .set("Cookie", "sess=t-relogin");
    expect(r2.status).toBe(200);
  });

  it("POST cancel-exclusion sem nada pendente → cancelado: false", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/user/data/cancel-exclusion")
      .set("Cookie", cookiesSessao("t-relogin"))
      .set("x-csrf-token", CSRF)
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.cancelado).toBe(false);
  });

  it("DELETE sem CSRF (sessão presente) → 403 (double-submit)", async () => {
    const r = await request(app.getHttpServer())
      .delete("/api/v1/user/data")
      .set("Cookie", "sess=t-relogin")
      .send({});
    expect(r.status).toBe(403);
  });
});

describe("T473 — rate limit do endpoint de direitos (429)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    // Limite baixo (3/min) para prova rápida — o endpoint está sob o rate
    // limiter global (chamadas sem sessão também contam: proteção anti-abuso).
    app = await montarAppDireitos(criarEstado(), { apiPerMinute: 3 });
  }, 60_000);

  afterAll(async () => {
    if (app) await app.close().catch(() => undefined);
  });

  it("excesso de chamadas a GET /user/data → 429", async () => {
    const s1 = await request(app.getHttpServer()).get("/api/v1/user/data");
    const s2 = await request(app.getHttpServer()).get("/api/v1/user/data");
    const s3 = await request(app.getHttpServer()).get("/api/v1/user/data");
    expect([s1.status, s2.status, s3.status]).toEqual([401, 401, 401]);
    const s4 = await request(app.getHttpServer()).get("/api/v1/user/data");
    expect(s4.status).toBe(429);
    expect(s4.body.statusCode).toBe(429);
  });
});

describe("T473 — userRightsRateLimit (limite dedicado da exportação)", () => {
  it("exportação tem limite dedicado: 6/min, janela de 1 minuto", async () => {
    delete process.env.RATE_LIMIT_USER_RIGHTS_PER_MIN;
    const { userRightsRateLimit } = await import("../src/common/rate-limit.config.js");
    const opts = userRightsRateLimit();
    expect(opts.max).toBe(6);
    expect(opts.timeWindow).toBe("1 minute");
  });

  it("respeita env RATE_LIMIT_USER_RIGHTS_PER_MIN", async () => {
    process.env.RATE_LIMIT_USER_RIGHTS_PER_MIN = "2";
    const { userRightsRateLimit } = await import("../src/common/rate-limit.config.js");
    expect(userRightsRateLimit().max).toBe(2);
    delete process.env.RATE_LIMIT_USER_RIGHTS_PER_MIN;
  });
});
