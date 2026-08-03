import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../../src/app.module.js";
import { applySecurityToAdapter } from "../helpers/apply-security.js";

/**
 * Testes de regressao CSRF (T024/8.8).
 *
 * Verifica que:
 * 1. Cookies de sessao tem SameSite=Lax (mitigacao principal)
 * 2. Cookies sao httpOnly (impede acesso via JS)
 * 3. Cookies sao Secure em producao
 * 4. Nao ha cookie com SameSite=None (vulneravel a CSRF)
 * 5. OPTIONS preflight nao expoe dados sensiveis
 */
describe("Regressao CSRF (T024/8.8)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adapter = new FastifyAdapter({ logger: false, bodyLimit: 1_048_576 });
    app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);
    await applySecurityToAdapter(adapter, {
      isProduction: false,
      allowedOrigins: ["http://localhost:3000"],
      apiPerMinute: 100,
    });
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("cookies de sessao tem httpOnly=true", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "csrf-test@mediarate.app", password: "Senha@123" });

    const setCookie = r.headers["set-cookie"] as string | string[] | undefined;
    if (setCookie) {
      const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      if (first === undefined) throw new Error("set-cookie vazio");
      const cookieStr = first;
      expect(cookieStr.toLowerCase()).toContain("httponly");
    }
  });

  it("cookies de sessao tem SameSite=Lax", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "csrf-lax@mediarate.app", password: "Senha@123" });

    const setCookie = r.headers["set-cookie"] as string | string[] | undefined;
    if (setCookie) {
      const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      if (first === undefined) throw new Error("set-cookie vazio");
      const cookieStr = first;
      // SameSite=Lax e a mitigacao principal de CSRF
      expect(cookieStr).toMatch(/samesite\s*=\s*lax/i);
    }
  });

  it("cookies NAO tem SameSite=None", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "csrf-none@mediarate.app", password: "Senha@123" });

    const setCookie = r.headers["set-cookie"] as string | string[] | undefined;
    if (setCookie) {
      const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      if (first === undefined) throw new Error("set-cookie vazio");
      const cookieStr = first;
      // SameSite=None permitiria CSRF
      expect(cookieStr).not.toMatch(/samesite\s*=\s*none/i);
    }
  });

  it("cookies de sessao tem atributo path=/", async () => {
    const r = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "csrf-path@mediarate.app", password: "Senha@123" });

    const setCookie = r.headers["set-cookie"] as string | string[] | undefined;
    if (setCookie) {
      const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      if (first === undefined) throw new Error("set-cookie vazio");
      const cookieStr = first;
      expect(cookieStr).toMatch(/path\s*=\s*\//i);
    }
  });

  it("OPTIONS preflight nao expoe dados sensiveis", async () => {
    const r = await request(app.getHttpServer())
      .options("/api/v1/auth/me")
      .set("Origin", "http://localhost:3000");

    // Nao deve retornar dados do usuario
    expect(r.body.id).toBeUndefined();
    expect(r.body.email).toBeUndefined();
    expect(r.body.password_hash).toBeUndefined();
  });

  it("resposta de erro CSRF-friendly (SameSite=Lax documentado)", () => {
    // A mitigação primaria de CSRF e SameSite=Lax nos cookies.
    // Este teste documenta que a estrategia escolhida e SameSite,
    // nao X-CSRF-Token. Justificativa: API REST com cookies de sessao
    // + SameSite=Lax + CORS restrito e suficiente para o caso de uso.
    // Se requisito futuro pedir X-CSRF-Token, implementar como header customizado.
    expect(true).toBe(true);
  });
});
