import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { applySecurityToAdapter } from "./helpers/apply-security.js";

describe("CSP com nonce dinamico (T021/7.1)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adapter = new FastifyAdapter({
      logger: false,
      bodyLimit: 1_048_576,
    });
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

  it("resposta HTTP contem header Content-Security-Policy", async () => {
    const r = await request(app.getHttpServer()).get("/health");
    expect(r.status).toBe(200);
    expect(r.headers["content-security-policy"]).toBeDefined();
  });

  it("CSP nao contem 'unsafe-inline' em script-src", async () => {
    const r = await request(app.getHttpServer()).get("/health");
    const csp = r.headers["content-security-policy"] as string;
    expect(csp).toBeDefined();
    // Extrai a parte script-src
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    if (scriptSrc) {
      expect(scriptSrc).not.toContain("unsafe-inline");
    }
  });

  it("CSP contem 'nonce-' em script-src", async () => {
    const r = await request(app.getHttpServer()).get("/health");
    const csp = r.headers["content-security-policy"] as string;
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    if (scriptSrc) {
      expect(scriptSrc).toContain("nonce-");
    }
  });

  it("nonce e diferente entre requisicoes", async () => {
    const r1 = await request(app.getHttpServer()).get("/health");
    const r2 = await request(app.getHttpServer()).get("/health");

    const csp1 = r1.headers["content-security-policy"] as string;
    const csp2 = r2.headers["content-security-policy"] as string;

    const extractNonce = (csp: string) => {
      const match = csp.match(/nonce-([A-Za-z0-9+/=_-]+)/);
      return match ? match[1] : null;
    };

    const nonce1 = extractNonce(csp1);
    const nonce2 = extractNonce(csp2);

    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toBe(nonce2);
  });

  it("style-src mantem 'unsafe-inline' (TailwindCSS)", async () => {
    const r = await request(app.getHttpServer()).get("/health");
    const csp = r.headers["content-security-policy"] as string;
    const styleSrc = csp.split(";").find((d) => d.trim().startsWith("style-src"));
    expect(styleSrc).toBeDefined();
    if (styleSrc) {
      expect(styleSrc).toContain("unsafe-inline");
    }
  });

  it("frameguard X-Frame-Options permanece DENY", async () => {
    const r = await request(app.getHttpServer()).get("/health");
    expect(r.headers["x-frame-options"]).toBe("DENY");
  });
});
