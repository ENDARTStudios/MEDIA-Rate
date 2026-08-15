import { describe, it, expect } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import { CsrfGuard } from "../src/common/guards/csrf.guard.js";

function ctx(method: string, cookies?: Record<string, string>, header?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, cookies, headers: { "x-csrf-token": header } }),
      getResponse: () => ({ status: () => ({ send: () => undefined }) }),
    }),
  } as unknown as ExecutionContext;
}

const TOKEN = "a".repeat(64);

describe("CsrfGuard (T325 — enforcement em métodos mutantes)", () => {
  it("GET com sessão passa (não é mutante)", () => {
    const g = new CsrfGuard();
    expect(g.canActivate(ctx("GET", { sess: "s", csrf_token: TOKEN }))).toBe(true);
  });

  it("POST sem sessão passa (AuthGuard devolve 401)", () => {
    const g = new CsrfGuard();
    expect(g.canActivate(ctx("POST", undefined))).toBe(true);
  });

  it("POST com sessão e token casado passa", () => {
    const g = new CsrfGuard();
    expect(g.canActivate(ctx("POST", { sess: "s", csrf_token: TOKEN }, TOKEN))).toBe(true);
  });

  it("POST com sessão sem header X-CSRF-Token bloqueia", () => {
    const g = new CsrfGuard();
    expect(g.canActivate(ctx("POST", { sess: "s", csrf_token: TOKEN }))).toBe(false);
  });

  it("POST com sessão e token divergente bloqueia", () => {
    const g = new CsrfGuard();
    expect(g.canActivate(ctx("POST", { sess: "s", csrf_token: TOKEN }, "b".repeat(64)))).toBe(
      false,
    );
  });

  it("DELETE com sessão e token casado passa", () => {
    const g = new CsrfGuard();
    expect(g.canActivate(ctx("DELETE", { sess: "s", csrf_token: TOKEN }, TOKEN))).toBe(true);
  });
});
