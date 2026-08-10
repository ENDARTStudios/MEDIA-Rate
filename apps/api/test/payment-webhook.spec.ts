/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi } from "vitest";
import { PaymentService } from "../src/modules/payment/payment.service.js";

/**
 * Regressão do bug do webhook: o gateway retorna `event.data` como o wrapper
 * Stripe `{ object }` — o handler deve ler `data.object` (e não `data.data.object`).
 */
function montarService() {
  const upsertPlano = vi.fn().mockResolvedValue({});
  const prisma = {
    eventoPagamento: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "evt-db" }),
      update: vi.fn().mockResolvedValue({}),
    },
    usuarioPlano: { upsert: upsertPlano, update: vi.fn().mockResolvedValue({}) },
  };
  const gateway = {
    constructWebhookEvent: vi.fn(),
  };
  const service = new PaymentService(prisma as never, gateway as never);
  return { prisma, gateway, service, upsertPlano };
}

describe("PaymentService.processWebhook — regressão data.object (fix webhook)", () => {
  it("checkout.session.completed com metadata sincroniza o plano (TRIALING)", async () => {
    const { gateway, service, upsertPlano } = montarService();
    const trialEnd = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    gateway.constructWebhookEvent.mockResolvedValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          metadata: { usuario_id: "u1", plano: "PLUS" },
          subscription: "sub_1",
          customer: "cus_1",
          current_period_end: trialEnd,
        },
      },
    });

    const result = await service.processWebhook('{"raw":"body"}', "sig");

    expect(result.processed).toBe(true);
    expect(upsertPlano).toHaveBeenCalledTimes(1);
    const call = upsertPlano.mock.calls[0]![0] as {
      where: { usuario_id: string };
      create: { plano: string; status: string; stripe_subscription_id: string };
    };
    expect(call.where.usuario_id).toBe("u1");
    expect(call.create.plano).toBe("PLUS");
    expect(call.create.status).toBe("TRIALING");
    expect(call.create.stripe_subscription_id).toBe("sub_1");
  });

  it("customer.subscription.created trialing registra trial_ends_at", async () => {
    const { gateway, service, upsertPlano } = montarService();
    const trialEnd = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    gateway.constructWebhookEvent.mockResolvedValue({
      id: "evt_2",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_1",
          status: "trialing",
          metadata: { usuario_id: "u1", plano: "PLUS" },
          customer: "cus_1",
          current_period_end: trialEnd,
        },
      },
    });

    await service.processWebhook("{}", "sig");

    const call = upsertPlano.mock.calls[0]![0] as {
      create: { plano: string; status: string; trial_ends_at: Date };
    };
    expect(call.create.plano).toBe("PLUS");
    expect(call.create.status).toBe("TRIALING");
    expect(call.create.trial_ends_at.getTime()).toBe(trialEnd * 1000);
  });

  it("evento sem usuario_id não sincroniza (mas não falha)", async () => {
    const { gateway, service, upsertPlano } = montarService();
    gateway.constructWebhookEvent.mockResolvedValue({
      id: "evt_3",
      type: "customer.created",
      data: { object: { id: "cus_1" } },
    });

    const result = await service.processWebhook("{}", "sig");
    expect(result.processed).toBe(true);
    expect(upsertPlano).not.toHaveBeenCalled();
  });
});
