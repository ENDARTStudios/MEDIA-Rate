import { describe, it, expect, vi, afterEach } from "vitest";
import { Logger } from "@nestjs/common";
import { GlobalExceptionFilter } from "../src/common/global-exception.filter.js";

/**
 * T070/D-551 — diagnóstico SEGURO de exceções não-Error no filtro global.
 *
 * O `/auth/me` retornou 500 com `Non-Error thrown: [object Object]` no harness,
 * sem identificar a origem. Este teste exige que o log interno inclua **tipo,
 * construtor e NOMES de chaves** do objeto lançado — e **nunca os VALORES**
 * (que poderiam conter PII/segredos). O status permanece **500** (não mascara).
 */
function buildHost() {
  const reply = {
    header: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  const request = {
    headers: { "user-agent": "Mozilla/5.0 (Pixel 5) Mobile Safari/537.36" },
    method: "GET",
    url: "/api/v1/auth/me",
    ip: "203.0.113.9",
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => reply, getRequest: () => request }),
  };
  return { host, reply };
}

describe("T070 — GlobalExceptionFilter: não-Error com diagnóstico seguro", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loga tipo/construtor/nomes de chaves, sem valores, e mantém 500", () => {
    const logs: string[] = [];
    vi.spyOn(Logger.prototype, "error").mockImplementation(
      (m: unknown) => void logs.push(String(m)),
    );
    const { host, reply } = buildHost();

    const filter = new GlobalExceptionFilter();
    filter.catch({ foo: "valor-secreto", bar: 1, baz: { nested: true } }, host as never);

    const log = logs.join("\n");
    expect(log).toContain("Non-Error");
    expect(log).toContain("foo");
    expect(log).toContain("bar");
    expect(log).toContain("baz");
    // NUNCA os valores (podem conter PII/segredos).
    expect(log).not.toContain("valor-secreto");
    expect(log).not.toContain("nested");
    // Status 500 preservado (não transformar em 401 para silenciar).
    expect(reply.status).toHaveBeenCalledWith(500);
  });
});

describe("T072 — honra statusCode 400–599 de não-Error (ex.: rate limit 429)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("objeto {statusCode:429} → resposta 429, sem vazar a message interna", () => {
    const logs: string[] = [];
    vi.spyOn(Logger.prototype, "error").mockImplementation(
      (m: unknown) => void logs.push(String(m)),
    );
    const { host, reply } = buildHost();

    new GlobalExceptionFilter().catch(
      { statusCode: 429, error: "Too Many Requests", message: "internal detail should not leak" },
      host as never,
    );

    expect(reply.status).toHaveBeenCalledWith(429);
    const body = (reply.send.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain("internal detail");
    expect(logs.join("\n")).not.toContain("internal detail");
  });

  for (const sc of [200, 302, 600, -1, "429", null, NaN]) {
    it(`statusCode inválido (${String(sc)}) → mantém 500`, () => {
      vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
      const { host, reply } = buildHost();
      new GlobalExceptionFilter().catch({ statusCode: sc }, host as never);
      expect(reply.status).toHaveBeenCalledWith(500);
    });
  }
});
