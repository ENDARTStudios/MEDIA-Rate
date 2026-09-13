import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AnalyticsService, AnalyticsEvents } from "../src/common/analytics.service.js";

describe("AnalyticsService (T1.9)", () => {
  let originalWriteKey: string | undefined;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalWriteKey = process.env.ANALYTICS_WRITE_KEY;
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    if (originalWriteKey === undefined) delete process.env.ANALYTICS_WRITE_KEY;
    else process.env.ANALYTICS_WRITE_KEY = originalWriteKey;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it("desabilita quando ANALYTICS_WRITE_KEY ausente", () => {
    delete process.env.ANALYTICS_WRITE_KEY;
    const svc = new AnalyticsService();
    expect(svc.isEnabled()).toBe(false);
  });

  it("habilita quando ANALYTICS_WRITE_KEY presente", () => {
    process.env.ANALYTICS_WRITE_KEY = "test-key";
    const svc = new AnalyticsService();
    expect(svc.isEnabled()).toBe(true);
  });

  it("captura evento sem lancar erro quando disabled", () => {
    delete process.env.ANALYTICS_WRITE_KEY;
    const svc = new AnalyticsService();
    expect(() =>
      svc.capture("user-123", AnalyticsEvents.USER_REGISTERED, {
        plan: "free",
      }),
    ).not.toThrow();
  });

  it("captura evento sem lancar erro quando enabled (sem rede real)", () => {
    process.env.ANALYTICS_WRITE_KEY = "test-key";
    const svc = new AnalyticsService();
    expect(() =>
      svc.capture("user-123", AnalyticsEvents.PLAN_CHECKOUT_COMPLETED, {
        plan: "plus",
        amount_cents: 1999,
      }),
    ).not.toThrow();
  });

  it("sanitiza PII: remove propriedade 'email'", () => {
    process.env.ANALYTICS_WRITE_KEY = "test-key";
    const svc = new AnalyticsService();
    const sanitized = svc.sanitize({
      plan: "free",
      email: "user@example.com",
      name: "John",
    });
    expect(sanitized).toEqual({ plan: "free", name: "John" });
    expect(sanitized.email).toBeUndefined();
  });

  it("sanitiza PII: remove 'cpf', 'phone', 'password', 'token'", () => {
    const svc = new AnalyticsService();
    const sanitized = svc.sanitize({
      cpf: "12345678901",
      phone: "+5511999999999",
      password: "secret",
      token: "Bearer xyz",
      ok: "kept",
    });
    expect(sanitized).toEqual({ ok: "kept" });
  });

  it("preserva propriedades de negocio (plan, amount, mrr)", () => {
    const svc = new AnalyticsService();
    const sanitized = svc.sanitize({
      plan: "premium",
      amount_cents: 2999,
      mrr: 2999,
      ltv_cac_ratio: 3.2,
    });
    expect(sanitized).toEqual({
      plan: "premium",
      amount_cents: 2999,
      mrr: 2999,
      ltv_cac_ratio: 3.2,
    });
  });

  it("todos os eventos do Discovery Q7 estao definidos", () => {
    expect(AnalyticsEvents.USER_REGISTERED).toBeDefined();
    expect(AnalyticsEvents.USER_SESSION_START).toBeDefined();
    expect(AnalyticsEvents.PLAN_CHECKOUT_STARTED).toBeDefined();
    expect(AnalyticsEvents.PLAN_CHECKOUT_COMPLETED).toBeDefined();
    expect(AnalyticsEvents.PLAN_DOWNGRADED).toBeDefined();
    expect(AnalyticsEvents.PLAN_CHURNED).toBeDefined();
    expect(AnalyticsEvents.RECOMMENDATION_SHOWN).toBeDefined();
    expect(AnalyticsEvents.RECOMMENDATION_CLICKED).toBeDefined();
    expect(AnalyticsEvents.MEDIA_SCORE_VIEWED).toBeDefined();
    expect(AnalyticsEvents.MRR_RECALCULATED).toBeDefined();
    expect(AnalyticsEvents.LTV_CAC_RECALCULATED).toBeDefined();
  });

  it("eventos de retencao D1/D7/D30 estao definidos", () => {
    expect(AnalyticsEvents.USER_RETURNED_D1).toBeDefined();
    expect(AnalyticsEvents.USER_RETURNED_D7).toBeDefined();
    expect(AnalyticsEvents.USER_RETURNED_D30).toBeDefined();
  });

  it("T452: eventos do funil de conversao estao definidos", () => {
    expect(AnalyticsEvents.TRIAL_STARTED).toBe("trial_started");
    expect(AnalyticsEvents.CHECKOUT_COMPLETED).toBe("checkout_completed");
    expect(AnalyticsEvents.SUBSCRIPTION_ACTIVATED).toBe("subscription_activated");
  });
});
