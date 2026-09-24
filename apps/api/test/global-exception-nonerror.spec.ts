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
