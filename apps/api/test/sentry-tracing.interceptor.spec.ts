import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lastValueFrom, of } from "rxjs";
import type { CallHandler, ExecutionContext } from "@nestjs/common";

const span = { setAttribute: vi.fn(), end: vi.fn() };
vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  startInactiveSpan: vi.fn(() => span),
  captureException: vi.fn(),
}));

import { SentryTracingInterceptor } from "../src/common/sentry-tracing.interceptor.js";

function ctx(): ExecutionContext {
  const request = { method: "GET", url: "/health", routeOptions: { url: "/health" } };
  const response = { statusCode: 200 };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

function handler(): CallHandler {
  return { handle: () => of("ok") } as unknown as CallHandler;
}

describe("T452 — SentryTracingInterceptor", () => {
  const original = { ...process.env };
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    Object.assign(process.env, original);
    if (!("SENTRY_DSN" in original)) delete process.env.SENTRY_DSN;
  });

  it("sem DSN: repassa o handler sem abrir span", async () => {
    delete process.env.SENTRY_DSN;
    const interceptor = new SentryTracingInterceptor();
    const out = await lastValueFrom(interceptor.intercept(ctx(), handler()));
    expect(out).toBe("ok");
    expect(span.end).not.toHaveBeenCalled();
  });

  it("com DSN: encerra o span com o status code no finalize", async () => {
    process.env.SENTRY_DSN = "http://fake@localhost/1";
    const interceptor = new SentryTracingInterceptor();
    await lastValueFrom(interceptor.intercept(ctx(), handler()));
    expect(span.end).toHaveBeenCalledTimes(1);
    expect(span.setAttribute).toHaveBeenCalledWith("http.status_code", 200);
  });
});
