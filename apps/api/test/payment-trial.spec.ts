import { describe, it, expect, vi } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { PaymentService } from "../src/modules/payment/payment.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { PAYMENT_GATEWAY } from "../src/modules/payment/domain/gateway/payment-gateway.port.js";
import { MockPaymentGateway } from "../src/modules/payment/adapter/mock-payment.gateway.js";

const USUARIO = { id: "u-1", email: "u@e.com" };

function buildMockPrisma(trialUsado: Date | null = null) {
  const mock = {
    usuarioPlano: {
      findUnique: vi.fn(async () => (trialUsado ? { trial_used_at: trialUsado } : null)),
      upsert: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    eventoPagamento: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "evt-1" })),
      update: vi.fn(async () => ({})),
    },
  };
  return mock;
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
  return {
    service: module.get(PaymentService),
    gateway: module.get(PAYMENT_GATEWAY),
  };
}

describe("T327 — trial único por usuário (trial_used_at)", () => {
  it("createCheckout PLUS sem trial anterior cria sessão com trial_period_days", async () => {
    const prisma = buildMockPrisma(null);
    const { service, gateway } = await buildService(prisma);

    const session = await service.createCheckout(
      { plano: "PLUS", success_url: "https://x/s", cancel_url: "https://x/c" },
      USUARIO,
    );
    expect(session.url).toContain("PLUS");
    expect(gateway.createdInputs[0].trial_period_days).toBe(7);
  });

  it("createCheckout PLUS com trial_used_at preenchido lança 409 determinístico", async () => {
    const prisma = buildMockPrisma(new Date("2026-01-01"));
    const { service, gateway } = await buildService(prisma);

    await expect(
      service.createCheckout(
        { plano: "PLUS", success_url: "https://x/s", cancel_url: "https://x/c" },
        USUARIO,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.createdInputs).toHaveLength(0); // sem efeito colateral
  });

  it("createCheckout PREMIUM ignora o gate de trial (sem trial, sempre permitido)", async () => {
    const prisma = buildMockPrisma(new Date("2026-01-01"));
    const { service, gateway } = await buildService(prisma);

    const session = await service.createCheckout(
      { plano: "PREMIUM", success_url: "https://x/s", cancel_url: "https://x/c" },
      USUARIO,
    );
    expect(session.url).toContain("PREMIUM");
    expect(gateway.createdInputs[0].trial_period_days).toBeUndefined();
  });

  it("webhook checkout.session.completed com trial marca trial_used_at (idempotente)", async () => {
    const prisma = buildMockPrisma(null);
    const { service } = await buildService(prisma);

    const future = Math.floor((Date.now() + 7 * 24 * 3600 * 1000) / 1000);
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { usuario_id: USUARIO.id, plano: "PLUS" },
          current_period_end: future,
          subscription: "sub_x",
          customer: "cus_x",
        },
      },
    });
    const res = await service.processWebhook(payload, "sig");
    expect(res.processed).toBe(true);
    expect(prisma.usuarioPlano.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuario_id: USUARIO.id, trial_used_at: null } }),
    );
  });
});
