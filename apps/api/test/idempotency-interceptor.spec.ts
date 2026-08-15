/* eslint-disable @typescript-eslint/no-extraneous-class */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import { IdempotencyInterceptor } from "../src/common/interceptors/idempotency.interceptor.js";
import { IdempotencyStore } from "../src/common/idempotency/idempotency.store.js";
import type { ExecutionContext, CallHandler } from "@nestjs/common";
import { of, firstValueFrom } from "rxjs";

function ctx(
  method: string,
  url: string,
  headers: Record<string, string>,
  userId?: string,
): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ method, url, headers, user: userId ? { id: userId } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe("IdempotencyInterceptor (T326 — global, mutante+autenticado+chave)", () => {
  let interceptor: IdempotencyInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    // Sem metadata @Idempotent() — testa o caminho GLOBAL (header opcional).
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    interceptor = new IdempotencyInterceptor(reflector, new IdempotencyStore());
  });

  it("GET com Idempotency-Key passa direto (não é mutante)", async () => {
    const handler = vi.fn(() => of({ ok: true }));
    const next: CallHandler = { handle: handler };
    const val = await firstValueFrom(
      interceptor.intercept(ctx("GET", "/api/v1/midias", { "idempotency-key": "k" }, "u1"), next),
    );
    expect(val).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("POST autenticado com chave cacheia e replay NÃO re-executa", async () => {
    const handler = vi.fn(() => of({ created: true }));
    const c = ctx("POST", "/api/v1/watchlist", { "idempotency-key": "k-1" }, "u1");

    const v1 = await firstValueFrom(interceptor.intercept(c, { handle: handler }));
    expect(v1).toEqual({ created: true });
    expect(handler).toHaveBeenCalledTimes(1);

    const handler2 = vi.fn(() => of({ created: false }));
    const v2 = await firstValueFrom(interceptor.intercept(c, { handle: handler2 }));
    expect(v2).toEqual({ created: true }); // cacheada
    expect(handler2).not.toHaveBeenCalled();
  });

  it("POST autenticado SEM chave passa direto (sem idempotência)", async () => {
    const handler = vi.fn(() => of({ created: true }));
    const c = ctx("POST", "/api/v1/watchlist", {}, "u1");
    await firstValueFrom(interceptor.intercept(c, { handle: handler }));
    await firstValueFrom(interceptor.intercept(c, { handle: handler }));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("POST não autenticado com chave passa direto (AuthGuard 401)", async () => {
    const handler = vi.fn(() => of({ ok: true }));
    const c = ctx("POST", "/api/v1/auth/login", { "idempotency-key": "k" });
    await firstValueFrom(interceptor.intercept(c, { handle: handler }));
    await firstValueFrom(interceptor.intercept(c, { handle: handler }));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("chaves diferentes em usuários diferentes não compartilham cache", async () => {
    const handler1 = vi.fn(() => of({ user: "u1" }));
    const handler2 = vi.fn(() => of({ user: "u2" }));
    const c1 = ctx("POST", "/api/v1/watchlist", { "idempotency-key": "same" }, "u1");
    const c2 = ctx("POST", "/api/v1/watchlist", { "idempotency-key": "same" }, "u2");
    await firstValueFrom(interceptor.intercept(c1, { handle: handler1 }));
    const v = await firstValueFrom(interceptor.intercept(c2, { handle: handler2 }));
    expect(v).toEqual({ user: "u2" });
    expect(handler2).toHaveBeenCalledOnce();
  });

  it("chave com mais de 256 caracteres lança 400", () => {
    const c = ctx("POST", "/api/v1/watchlist", { "idempotency-key": "x".repeat(257) }, "u1");
    const next: CallHandler = { handle: () => of({ ok: true }) };
    expect(() => interceptor.intercept(c, next)).toThrow(/muito longo/);
  });
});
