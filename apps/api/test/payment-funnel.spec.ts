import { describe, it, expect, vi } from "vitest";
import { PaymentService } from "../src/modules/payment/payment.service.js";
import { MockPaymentGateway } from "../src/modules/payment/adapter/mock-payment.gateway.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { AnalyticsEvents } from "../src/common/analytics.service.js";
import type { AnalyticsService } from "../src/common/analytics.service.js";

/**
 * T452 — funil de conversao: createCheckout deve emitir PLAN_CHECKOUT_STARTED
 * com distinctId = id do usuario (nunca email).
 */
describe("T452 — funil PostHog no PaymentService", () => {
  it("createCheckout emite plan_checkout_started (sem PII)", async () => {
    const prisma = {} as unknown as PrismaService;
    const gateway = new MockPaymentGateway();
    const analytics = { capture: vi.fn(), identify: vi.fn() } as unknown as AnalyticsService;
    const svc = new PaymentService(prisma, gateway, undefined, analytics);

    await svc.createCheckout(
      {
        plano: "PREMIUM",
        success_url: "https://app.example.com/success",
        cancel_url: "https://app.example.com/cancel",
      },
      { id: "user-1", email: "user@example.com" },
    );

    expect(analytics.capture).toHaveBeenCalledWith(
      "user-1",
      AnalyticsEvents.PLAN_CHECKOUT_STARTED,
      expect.objectContaining({ plan: "PREMIUM" }),
    );
  });

  it("sem analytics injetado, createCheckout nao quebra", async () => {
    const prisma = {} as unknown as PrismaService;
    const gateway = new MockPaymentGateway();
    const svc = new PaymentService(prisma, gateway);
    await expect(
      svc.createCheckout(
        {
          plano: "PREMIUM",
          success_url: "https://app.example.com/success",
          cancel_url: "https://app.example.com/cancel",
        },
        { id: "user-1", email: "user@example.com" },
      ),
    ).resolves.toBeDefined();
  });
});
