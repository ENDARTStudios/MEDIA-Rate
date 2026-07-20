/* eslint-disable @typescript-eslint/no-extraneous-class */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import { IdempotencyInterceptor } from "../src/common/interceptors/idempotency.interceptor.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import type { ExecutionContext, CallHandler } from "@nestjs/common";
import { of, firstValueFrom } from "rxjs";

function createMockPrisma(): PrismaService {
  return {} as PrismaService;
}

function createExecutionContext(
  headers: Record<string, string>,
  isIdempotent: boolean,
  userId?: string,
): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({
        method: "POST",
        url: "/api/v1/checkout",
        headers,
        user: userId ? { id: userId } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("IdempotencyInterceptor (T4.3)", () => {
  let interceptor: IdempotencyInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    const prisma = createMockPrisma();
    interceptor = new IdempotencyInterceptor(reflector, prisma);
  });

  it("permite passar se rota não é @Idempotent()", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    const ctx = createExecutionContext({}, false);
    const next: CallHandler = { handle: () => of({ ok: true }) };
    const val = await firstValueFrom(interceptor.intercept(ctx, next));
    expect(val).toEqual({ ok: true });
  });

  it("rejeita 400 se header Idempotency-Key ausente em rota @Idempotent()", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    const ctx = createExecutionContext({}, true);
    const next: CallHandler = { handle: () => of({ ok: true }) };
    await expect(
      new Promise((resolve, reject) => {
        interceptor.intercept(ctx, next).subscribe({ next: resolve, error: reject });
      }),
    ).rejects.toThrow(/Idempotency-Key/);
  });

  it("primeira chamada executa handler e cacheia resposta", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    const ctx = createExecutionContext({ "idempotency-key": "abc-123" }, true, "user-1");
    const handler = vi.fn(() => of({ result: "first" }));
    const next: CallHandler = { handle: handler };
    const val = await firstValueFrom(interceptor.intercept(ctx, next));
    expect(val).toEqual({ result: "first" });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("segunda chamada com mesma Idempotency-Key retorna resposta cacheada SEM executar handler", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    const ctx = createExecutionContext({ "idempotency-key": "abc-123" }, true, "user-1");
    const handler = vi.fn(() => of({ result: "first" }));
    const next: CallHandler = { handle: handler };

    // Primeira chamada
    await firstValueFrom(interceptor.intercept(ctx, next));

    // Segunda chamada com mesma key
    const handler2 = vi.fn(() => of({ result: "should-not-execute" }));
    const next2: CallHandler = { handle: handler2 };
    const val = await firstValueFrom(interceptor.intercept(ctx, next2));
    expect(val).toEqual({ result: "first" }); // cacheada
    expect(handler2).not.toHaveBeenCalled();
  });

  it("cache key inclui user_id (diferentes usuários não compartilham)", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    const ctx1 = createExecutionContext({ "idempotency-key": "abc-123" }, true, "user-1");
    const ctx2 = createExecutionContext({ "idempotency-key": "abc-123" }, true, "user-2");
    const handler1 = vi.fn(() => of({ result: "user-1-response" }));
    const handler2 = vi.fn(() => of({ result: "user-2-response" }));

    await firstValueFrom(interceptor.intercept(ctx1, { handle: handler1 }));
    const val = await firstValueFrom(interceptor.intercept(ctx2, { handle: handler2 }));
    expect(val).toEqual({ result: "user-2-response" });
    expect(handler2).toHaveBeenCalledOnce();
  });

  it("cache key inclui URL (diferentes endpoints não compartilham)", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    const ctx1: ExecutionContext = {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({
          method: "POST",
          url: "/api/v1/checkout",
          headers: { "idempotency-key": "abc" },
          user: { id: "u1" },
        }),
      }),
    } as unknown as ExecutionContext;
    const ctx2: ExecutionContext = {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({
          method: "POST",
          url: "/api/v1/webhooks/stripe",
          headers: { "idempotency-key": "abc" },
          user: { id: "u1" },
        }),
      }),
    } as unknown as ExecutionContext;

    const handler1 = vi.fn(() => of({ endpoint: "checkout" }));
    const handler2 = vi.fn(() => of({ endpoint: "webhook" }));

    await firstValueFrom(interceptor.intercept(ctx1, { handle: handler1 }));
    const val = await firstValueFrom(interceptor.intercept(ctx2, { handle: handler2 }));
    expect(val).toEqual({ endpoint: "webhook" });
    expect(handler2).toHaveBeenCalledOnce();
  });
});
