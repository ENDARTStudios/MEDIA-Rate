import { describe, it, expect, vi } from "vitest";
import { PaymentService } from "../src/modules/payment/payment.service.js";
import { MockPaymentGateway } from "../src/modules/payment/adapter/mock-payment.gateway.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

interface SetConfigCall {
  setting: string;
  value: string;
}

/** Mock de Prisma COM $transaction — captura as chamadas de set_config. */
function buildRlsMockPrisma() {
  const setConfigCalls: SetConfigCall[] = [];
  const usuarioPlano = {
    upsert: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    updateMany: vi.fn(async () => ({ count: 1 })),
  };
  const eventoPagamento = {
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: "evt" })),
    update: vi.fn(async () => ({})),
  };
  const tx = {
    $executeRawUnsafe: vi.fn(async (sql: string, valor: unknown) => {
      const m = /set_config\('([^']+)'/.exec(sql);
      const setting = m?.[1];
      if (setting) setConfigCalls.push({ setting, value: String(valor) });
    }),
    usuarioPlano,
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    usuarioPlano,
    eventoPagamento,
    usuario: { findUnique: vi.fn() },
  };
  return { prisma, setConfigCalls };
}

function webhookPayload(tipo: string, usuarioId: string): string {
  return JSON.stringify({
    type: tipo,
    data: { object: { metadata: { usuario_id: usuarioId, plano: "PLUS" } } },
  });
}

describe("PaymentService — contexto RLS (T343)", () => {
  it("escrita de usuario_plano roda sob comContextoRls com role SERVICE e usuarioId", async () => {
    const { prisma, setConfigCalls } = buildRlsMockPrisma();
    const service = new PaymentService(
      prisma as unknown as PrismaService,
      new MockPaymentGateway(),
    );

    await service.processWebhook(
      webhookPayload("customer.subscription.trial_will_end", "u1"),
      "sig",
    );

    expect(setConfigCalls).toContainEqual({ setting: "app.current_user_role", value: "SERVICE" });
    expect(setConfigCalls).toContainEqual({ setting: "app.current_user_id", value: "u1" });
    expect(setConfigCalls).toContainEqual({
      setting: "app.current_tenant_id",
      value: "00000000-0000-0000-0000-000000000001",
    });
  });

  it("checkout.session.completed (trial) usa role SERVICE no upsert e no updateMany", async () => {
    const { prisma, setConfigCalls } = buildRlsMockPrisma();
    const service = new PaymentService(
      prisma as unknown as PrismaService,
      new MockPaymentGateway(),
    );

    const future = Math.floor((Date.now() + 7 * 24 * 3600 * 1000) / 1000);
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { usuario_id: "u2", plano: "PLUS" },
          current_period_end: future,
          subscription: "sub_x",
          customer: "cus_x",
        },
      },
    });
    await service.processWebhook(payload, "sig");

    // ativarAssinatura (upsert) + marcarTrialUsado (updateMany) — ambos SERVICE.
    const roleCalls = setConfigCalls.filter((c) => c.setting === "app.current_user_role");
    expect(roleCalls.length).toBeGreaterThanOrEqual(2);
    expect(roleCalls.every((c) => c.value === "SERVICE")).toBe(true);
  });

  it("sem $transaction no prisma (mock de teste) a escrita ainda funciona", async () => {
    // Fallback do comContextoRls: fn(prisma) direto, sem set_config.
    const prisma = {
      usuarioPlano: { update: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({})) },
      eventoPagamento: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: "evt" })),
        update: vi.fn(async () => ({})),
      },
    };
    const service = new PaymentService(
      prisma as unknown as PrismaService,
      new MockPaymentGateway(),
    );

    const res = await service.processWebhook(
      webhookPayload("customer.subscription.trial_will_end", "u1"),
      "sig",
    );
    expect(res.processed).toBe(true);
    expect(prisma.usuarioPlano.update).toHaveBeenCalledOnce();
  });
});
