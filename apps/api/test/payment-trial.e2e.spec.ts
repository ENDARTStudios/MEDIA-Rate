import { describe, it, expect, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { PaymentService } from "../src/modules/payment/payment.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { PAYMENT_GATEWAY } from "../src/modules/payment/domain/gateway/payment-gateway.port.js";
import { MockPaymentGateway } from "../src/modules/payment/adapter/mock-payment.gateway.js";

const USUARIO = { id: "u-1", email: "u@e.com" };

function buildMockPrisma() {
  const update = vi.fn(async () => ({}));
  const mock = {
    usuarioPlano: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
      update,
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    usuario: { findUnique: vi.fn(async () => ({ email: USUARIO.email })) },
    eventoPagamento: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "evt-1" })),
      update: vi.fn(async () => ({})),
    },
  };
  return { mock, update };
}

async function buildService(
  prisma: unknown,
): Promise<{ service: PaymentService; gateway: MockPaymentGateway }> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PaymentService,
      { provide: PrismaService, useValue: prisma },
      { provide: PAYMENT_GATEWAY, useClass: MockPaymentGateway },
    ],
  }).compile();
  const service = module.get(PaymentService);
  const gateway = module.get(PAYMENT_GATEWAY);
  return { service, gateway };
}

function evento(type: string, objeto: Record<string, unknown>): string {
  return JSON.stringify({ type, data: { object: objeto } });
}

describe("T434 (D-416 híbrido) — trial sem conversão automática (webhooks)", () => {
  it("(a) customer.subscription.created trialing marca cancel_at_period_end (sem conversão)", async () => {
    const { mock } = buildMockPrisma();
    const { service, gateway } = await buildService(mock);
    const future = Math.floor((Date.now() + 7 * 24 * 3600 * 1000) / 1000);
    await service.processWebhook(
      evento("customer.subscription.created", {
        id: "sub_trial_1",
        status: "trialing",
        current_period_end: future,
        metadata: { usuario_id: USUARIO.id, plano: "PLUS" },
        customer: "cus_x",
      }),
      "sig",
    );
    expect(gateway.cancelAtPeriodEnd).toContain("sub_trial_1");
  });

  it("(b) customer.subscription.trial_will_end notifica usuário (não cobra)", async () => {
    const { mock } = buildMockPrisma();
    const { service } = await buildService(mock);
    await service.processWebhook(
      evento("customer.subscription.trial_will_end", {
        id: "sub_trial_1",
        metadata: { usuario_id: USUARIO.id, plano: "PLUS" },
      }),
      "sig",
    );
    const call = mock.usuarioPlano.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call).toBeDefined();
    expect(call.data).toHaveProperty("trial_notified_at");
  });

  it("(c) customer.subscription.deleted faz downgrade ao FREE (sem cobrança)", async () => {
    const { mock } = buildMockPrisma();
    const { service } = await buildService(mock);
    await service.processWebhook(
      evento("customer.subscription.deleted", {
        id: "sub_trial_1",
        metadata: { usuario_id: USUARIO.id, plano: "PLUS" },
      }),
      "sig",
    );
    const call = mock.usuarioPlano.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.plano).toBe("FREE");
    expect(call.data.status).toBe("CANCELADA");
    expect(call.data).toHaveProperty("cancela_em");
  });
});
