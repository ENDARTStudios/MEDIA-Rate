import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock do SDK: nenhuma rede; espiona as opções de init e o tracing.
vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  startInactiveSpan: vi.fn(() => ({ setAttribute: vi.fn(), end: vi.fn() })),
  captureException: vi.fn(() => "evt-test"),
}));

import * as Sentry from "@sentry/node";
import {
  initSentry,
  sentryRelease,
  sentryTracesSampleRate,
  iniciarTransacaoHttp,
} from "../src/common/sentry.js";

interface SentryMock {
  mock: { calls: unknown[][] };
}
const initMock = Sentry.init as unknown as SentryMock;
const spanMock = Sentry.startInactiveSpan as unknown as SentryMock;

describe("T452 — Sentry server-side (release, PII e tracing)", () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("sentryRelease prioriza SENTRY_RELEASE", () => {
    process.env.SENTRY_RELEASE = "v1.2.3";
    process.env.RAILWAY_GIT_COMMIT_SHA = "railway-sha";
    process.env.GIT_COMMIT = "git-sha";
    expect(sentryRelease()).toBe("v1.2.3");
  });

  it("sentryRelease cai para RAILWAY_GIT_COMMIT_SHA e depois GIT_COMMIT", () => {
    delete process.env.SENTRY_RELEASE;
    process.env.RAILWAY_GIT_COMMIT_SHA = "railway-sha";
    process.env.GIT_COMMIT = "git-sha";
    expect(sentryRelease()).toBe("railway-sha");
    delete process.env.RAILWAY_GIT_COMMIT_SHA;
    expect(sentryRelease()).toBe("git-sha");
    delete process.env.GIT_COMMIT;
    expect(sentryRelease()).toBeUndefined();
  });

  it("initSentry injeta release e sendDefaultPii=false", () => {
    process.env.SENTRY_DSN = "http://fake@localhost/1";
    process.env.SENTRY_RELEASE = "rel-1";
    expect(initSentry()).toBe(true);
    const opts = initMock.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.release).toBe("rel-1");
    expect(opts.sendDefaultPii).toBe(false);
    expect(typeof opts.beforeSend).toBe("function");
  });

  it("initSentry é no-op (false) sem DSN", () => {
    delete process.env.SENTRY_DSN;
    expect(initSentry()).toBe(false);
    expect(initMock).not.toHaveBeenCalled();
  });

  it("sentryTracesSampleRate usa env válido e default por ambiente", () => {
    process.env.SENTRY_TRACES_SAMPLE_RATE = "0.25";
    expect(sentryTracesSampleRate()).toBe(0.25);
    process.env.SENTRY_TRACES_SAMPLE_RATE = "invalido";
    process.env.NODE_ENV = "development";
    expect(sentryTracesSampleRate()).toBe(1);
    process.env.NODE_ENV = "production";
    expect(sentryTracesSampleRate()).toBe(0.1);
  });

  it("iniciarTransacaoHttp é no-op sem DSN e cria span com DSN", () => {
    delete process.env.SENTRY_DSN;
    expect(iniciarTransacaoHttp("GET", "/health")).toBeNull();
    expect(spanMock).not.toHaveBeenCalled();

    process.env.SENTRY_DSN = "http://fake@localhost/1";
    const span = iniciarTransacaoHttp("GET", "/health");
    expect(span).not.toBeNull();
    const opts = spanMock.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.op).toBe("http.server");
    expect(opts.forceTransaction).toBe(true);
    expect(opts.name).toBe("GET /health");
  });
});
