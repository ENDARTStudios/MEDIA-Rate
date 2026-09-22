import { describe, it, expect } from "vitest";
import { buildLoggerConfig, REDACTED_PATHS } from "../src/common/logger.config.js";

describe("Logger config (T1.8)", () => {
  it("buildLoggerConfig retorna config com redact.paths nao-vazio", () => {
    const config = buildLoggerConfig();
    expect(config.pinoHttp).toBeDefined();
    expect(config.pinoHttp.redact).toBeDefined();
    const redact = config.pinoHttp.redact as { paths: string[]; censor: string };
    expect(redact.paths.length).toBeGreaterThan(0);
    expect(redact.censor).toBe("[Redacted]");
  });

  it("REDACTED_PATHS inclui chaves criticas", () => {
    expect(REDACTED_PATHS).toContain("req.headers.authorization");
    expect(REDACTED_PATHS).toContain("req.headers.cookie");
    // T027/item 14 (#148): CSRF via header (double-submit) nunca em log.
    expect(REDACTED_PATHS).toContain('req.headers["x-csrf-token"]');
    expect(REDACTED_PATHS).toContain("req.body.password");
    expect(REDACTED_PATHS).toContain("req.body.password_hash");
    expect(REDACTED_PATHS).toContain("req.body.token");
    expect(REDACTED_PATHS).toContain("req.body.stripe_secret_key");
    expect(REDACTED_PATHS).toContain("*.password");
    expect(REDACTED_PATHS).toContain("*.token");
    expect(REDACTED_PATHS).toContain("*.secret");
  });

  it("nivel de log respeita LOG_LEVEL env", () => {
    process.env.LOG_LEVEL = "debug";
    const config = buildLoggerConfig();
    expect(config.pinoHttp.level).toBe("debug");
    delete process.env.LOG_LEVEL;
  });

  it("nivel de log default 'info' em producao quando LOG_LEVEL ausente", () => {
    process.env.NODE_ENV = "production";
    delete process.env.LOG_LEVEL;
    const config = buildLoggerConfig();
    expect(config.pinoHttp.level).toBe("info");
    process.env.NODE_ENV = "test";
  });

  it("nivel de log default 'debug' em dev quando LOG_LEVEL ausente", () => {
    process.env.NODE_ENV = "test";
    delete process.env.LOG_LEVEL;
    const config = buildLoggerConfig();
    expect(config.pinoHttp.level).toBe("debug");
  });

  it("autoLogging ignora /health", () => {
    const config = buildLoggerConfig();
    const autoLogging = config.pinoHttp.autoLogging as {
      ignore: (req: { url?: string }) => boolean;
    };
    expect(autoLogging.ignore({ url: "/health" })).toBe(true);
    expect(autoLogging.ignore({ url: "/api/v1/echo" })).toBe(false);
  });
});

describe("Logger redact em runtime (T1.8)", () => {
  it("pino redact substitui password por [Redacted]", async () => {
    const pino = (await import("pino")).default;
    const config = buildLoggerConfig();
    const redact = config.pinoHttp.redact as { paths: string[]; censor: string };

    const captured: string[] = [];
    const stream = {
      write: (chunk: string): void => {
        captured.push(chunk);
      },
    };
    const log = pino({ redact }, stream);

    log.info(
      {
        req: {
          body: {
            email: "user@example.com",
            password: "SUA_SENHA_SECRETA_AQUI",
            password_hash: "$argon2id$abc",
            token: "Bearer xyz",
          },
        },
      },
      "test message",
    );

    expect(captured.length).toBe(1);
    const first = captured[0];
    if (!first) throw new Error("nothing captured");
    const parsed = JSON.parse(first);
    expect(parsed.req.body.password).toBe("[Redacted]");
    expect(parsed.req.body.password_hash).toBe("[Redacted]");
    expect(parsed.req.body.token).toBe("[Redacted]");
    expect(parsed.req.body.email).toBe("user@example.com");
  });

  it("pino redact tambem cobre headers.authorization", async () => {
    const pino = (await import("pino")).default;
    const config = buildLoggerConfig();
    const redact = config.pinoHttp.redact as { paths: string[]; censor: string };

    const captured: string[] = [];
    const log = pino({ redact }, { write: (c: string) => captured.push(c) });

    log.info(
      {
        req: {
          headers: {
            "authorization": "Bearer SECRET_TOKEN_HERE",
            "cookie": "session=abc123",
            "user-agent": "test",
          },
        },
      },
      "auth test",
    );

    const first = captured[0];
    if (!first) throw new Error("nothing captured");
    const parsed = JSON.parse(first);
    expect(parsed.req.headers.authorization).toBe("[Redacted]");
    expect(parsed.req.headers.cookie).toBe("[Redacted]");
    expect(parsed.req.headers["user-agent"]).toBe("test");
  });

  it("pino redact cobre x-csrf-token (item 14 #148)", async () => {
    const pino = (await import("pino")).default;
    const config = buildLoggerConfig();
    const redact = config.pinoHttp.redact as { paths: string[]; censor: string };

    const captured: string[] = [];
    const log = pino({ redact }, { write: (c: string) => captured.push(c) });

    log.info(
      {
        req: {
          headers: {
            "x-csrf-token": "CSRF_TOKEN_SECRETO",
            "user-agent": "test",
          },
        },
      },
      "csrf test",
    );

    const first = captured[0];
    if (!first) throw new Error("nothing captured");
    const parsed = JSON.parse(first);
    expect(parsed.req.headers["x-csrf-token"]).toBe("[Redacted]");
    expect(parsed.req.headers["user-agent"]).toBe("test");
  });
});
