import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildCorsOptions } from "../src/common/cors.config.js";

function createMockCallback() {
  const calls: { err: Error | null; allowed: boolean }[] = [];
  const cb = (err: Error | null, allowed: boolean) => calls.push({ err, allowed });
  return { cb, calls };
}

describe("CORS Options (T056)", () => {
  let savedOrigins: string | undefined;
  let savedNodeEnv: string | undefined;

  beforeEach(() => {
    savedOrigins = process.env.ALLOWED_ORIGINS;
    savedNodeEnv = process.env.NODE_ENV;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.CORS_ORIGIN;
  });

  afterEach(() => {
    if (savedOrigins !== undefined) process.env.ALLOWED_ORIGINS = savedOrigins;
    else delete process.env.ALLOWED_ORIGINS;
    if (savedNodeEnv !== undefined) process.env.NODE_ENV = savedNodeEnv;
    else delete process.env.NODE_ENV;
    delete process.env.CORS_ORIGIN;
  });

  it("origem permitida — cb(null, true)", () => {
    process.env.ALLOWED_ORIGINS = "https://app.example.com";
    process.env.NODE_ENV = "test";
    const opts = buildCorsOptions();
    const { cb, calls } = createMockCallback();

    opts.origin("https://app.example.com", cb);
    expect(calls.length).toBe(1);
    const call = calls[0];
    if (!call) throw new Error("callback nao chamado");
    expect(call.err).toBeNull();
    expect(call.allowed).toBe(true);
  });

  it("origem NAO permitida — cb(null, false) SEM erro (nao causa 500)", () => {
    process.env.ALLOWED_ORIGINS = "https://app.example.com";
    process.env.NODE_ENV = "test";
    const opts = buildCorsOptions();
    const { cb, calls } = createMockCallback();

    opts.origin("https://evil.example", cb);
    expect(calls.length).toBe(1);
    const call = calls[0];
    if (!call) throw new Error("callback nao chamado");
    expect(call.err).toBeNull(); // T056: nunca Error → não vira 500
    expect(call.allowed).toBe(false);
  });

  it("sem header Origin — permitido (server-to-server)", () => {
    process.env.ALLOWED_ORIGINS = "https://app.example.com";
    process.env.NODE_ENV = "test";
    const opts = buildCorsOptions();
    const { cb, calls } = createMockCallback();

    opts.origin(undefined, cb);
    const call = calls[0];
    if (!call) throw new Error("callback nao chamado");
    expect(call.allowed).toBe(true);
  });

  it("CORS_ORIGIN fallback funciona quando ALLOWED_ORIGINS ausente", () => {
    process.env.CORS_ORIGIN = "https://fallback.example.com";
    process.env.NODE_ENV = "test";
    const opts = buildCorsOptions();
    const { cb, calls } = createMockCallback();

    opts.origin("https://fallback.example.com", cb);
    const call = calls[0];
    if (!call) throw new Error("callback nao chamado");
    expect(call.allowed).toBe(true);
  });

  it("credentials true por default", () => {
    process.env.ALLOWED_ORIGINS = "https://app.example.com";
    process.env.NODE_ENV = "test";
    const opts = buildCorsOptions();
    expect(opts.credentials).toBe(true);
  });

  it("allowedHeaders inclui X-CSRF-Token", () => {
    process.env.ALLOWED_ORIGINS = "https://app.example.com";
    process.env.NODE_ENV = "test";
    const opts = buildCorsOptions();
    expect(opts.allowedHeaders).toContain("X-CSRF-Token");
  });
});
