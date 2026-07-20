/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockPaymentGateway } from "../src/modules/payment/adapter/mock-payment.gateway.js";
import { PaymentService } from "../src/modules/payment/payment.service.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";

function createMockPrisma(): {
  prisma: PrismaService;
  eventoPagamento: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  usuarioPlano: {
    upsert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
} {
  const eventoPagamento = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const usuarioPlano = {
    upsert: vi.fn(),
    update: vi.fn(),
  };
  const prisma = { eventoPagamento, usuarioPlano } as unknown as PrismaService;
  return { prisma, eventoPagamento, usuarioPlano };
}

describe("PaymentService + MockPaymentGateway (T4.8)", () => {
  let svc: PaymentService;
  let gateway: MockPaymentGateway;
  let mock: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mock = createMockPrisma();
    gateway = new MockPaymentGateway();
    svc = new PaymentService(mock.prisma, gateway);
  });

  describe("createCheckout()", () => {
    it("cria sessão via gateway e retorna URL", async () => {
      const result = await svc.createCheckout(
        {
          plano: "PLUS",
          success_url: "https://app.example.com/success",
          cancel_url: "https://app.example.com/cancel",
        },
        { id: "user-1", email: "user@example.com" },
      );

      expect(result.id).toMatch(/^cs_test_/);
      expect(result.url).toContain("Mock checkout for PLUS");
      expect(result.subscription_id).toMatch(/^sub_test_/);
      expect(result.customer_id).toMatch(/^cus_test_/);
      expect(gateway.createdSessions).toHaveLength(1);
    });

    it("para PREMIUM, usa plano PREMIUM", async () => {
      const result = await svc.createCheckout(
        {
          plano: "PREMIUM",
          success_url: "https://app.example.com/success",
          cancel_url: "https://app.example.com/cancel",
        },
        { id: "user-1", email: "user@example.com" },
      );

      expect(result.url).toContain("PREMIUM");
    });
  });

  describe("processWebhook() — idempotência (T2.10 + T4.3)", () => {
    it("processa checkout.session.completed e ativa assinatura PLUS", async () => {
      mock.eventoPagamento.findUnique.mockResolvedValue(null); // não existe
      mock.eventoPagamento.create.mockResolvedValue({ id: "evt-1" });
      mock.eventoPagamento.update.mockResolvedValue({});
      mock.usuarioPlano.upsert.mockResolvedValue({});

      const payload = JSON.stringify({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            customer: "cus_123",
            subscription: "sub_123",
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            metadata: { usuario_id: "user-1", plano: "PLUS" },
          },
        },
      });

      const result = await svc.processWebhook(payload, "sig-mock");

      expect(result.processed).toBe(true);
      expect(result.type).toBe("checkout.session.completed");
      expect(mock.usuarioPlano.upsert).toHaveBeenCalledOnce();
      const upsertArg = mock.usuarioPlano.upsert.mock.calls[0]![0];
      expect(upsertArg.where.usuario_id).toBe("user-1");
      expect(upsertArg.create.plano).toBe("PLUS");
      expect(upsertArg.create.status).toBe("ATIVA");
      expect(upsertArg.create.stripe_subscription_id).toBe("sub_123");
    });

    it("idempotência: segundo webhook com mesmo event_id não reprocessa", async () => {
      mock.eventoPagamento.findUnique.mockResolvedValue({ id: "existing-evt" }); // já existe

      const payload = JSON.stringify({
        type: "checkout.session.completed",
        id: "evt_existing",
        data: { object: { metadata: { usuario_id: "u1", plano: "PLUS" } } },
      });

      const result = await svc.processWebhook(payload, "sig-mock");

      expect(result.processed).toBe(false);
      expect(mock.eventoPagamento.create).not.toHaveBeenCalled();
      expect(mock.usuarioPlano.upsert).not.toHaveBeenCalled();
    });

    it("customer.subscription.deleted cancela assinatura (downgrade FREE)", async () => {
      mock.eventoPagamento.findUnique.mockResolvedValue(null);
      mock.eventoPagamento.create.mockResolvedValue({ id: "evt-2" });
      mock.eventoPagamento.update.mockResolvedValue({});
      mock.usuarioPlano.update.mockResolvedValue({});

      const payload = JSON.stringify({
        type: "customer.subscription.deleted",
        data: {
          object: {
            metadata: { usuario_id: "user-1" },
          },
        },
      });

      const result = await svc.processWebhook(payload, "sig-mock");

      expect(result.processed).toBe(true);
      expect(mock.usuarioPlano.update).toHaveBeenCalledOnce();
      const updateArg = mock.usuarioPlano.update.mock.calls[0]![0];
      expect(updateArg.where.usuario_id).toBe("user-1");
      expect(updateArg.data.plano).toBe("FREE");
      expect(updateArg.data.status).toBe("CANCELADA");
    });

    it("webhook sem usuario_id no metadata é ignorado (não ativa)", async () => {
      mock.eventoPagamento.findUnique.mockResolvedValue(null);
      mock.eventoPagamento.create.mockResolvedValue({ id: "evt-3" });
      mock.eventoPagamento.update.mockResolvedValue({});

      const payload = JSON.stringify({
        type: "checkout.session.completed",
        data: { object: { metadata: {} } }, // sem usuario_id
      });

      const result = await svc.processWebhook(payload, "sig-mock");

      expect(result.processed).toBe(true);
      expect(mock.usuarioPlano.upsert).not.toHaveBeenCalled();
    });

    it("evento com tipo desconhecido é registrado mas não processa", async () => {
      mock.eventoPagamento.findUnique.mockResolvedValue(null);
      mock.eventoPagamento.create.mockResolvedValue({ id: "evt-4" });
      mock.eventoPagamento.update.mockResolvedValue({});

      const payload = JSON.stringify({
        type: "invoice.payment_succeeded",
        data: { object: {} },
      });

      const result = await svc.processWebhook(payload, "sig-mock");

      expect(result.processed).toBe(true);
      expect(result.type).toBe("invoice.payment_succeeded");
      expect(mock.usuarioPlano.upsert).not.toHaveBeenCalled();
    });
  });
});

describe("IPaymentGateway (porta Hexagonal T4.8)", () => {
  it("MockPaymentGateway implementa IPaymentGateway", () => {
    const gw = new MockPaymentGateway();
    expect(typeof gw.createCheckoutSession).toBe("function");
    expect(typeof gw.constructWebhookEvent).toBe("function");
    expect(typeof gw.cancelSubscription).toBe("function");
  });

  it("cancelSubscription registra no estado do mock", async () => {
    const gw = new MockPaymentGateway();
    await gw.cancelSubscription("sub_test_123");
    expect(gw.cancelledSubscriptions).toContain("sub_test_123");
  });

  it("constructWebhookEvent aceita payload JSON string", async () => {
    const gw = new MockPaymentGateway();
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1" } },
    });
    const event = await gw.constructWebhookEvent(payload, "sig");
    expect(event.type).toBe("checkout.session.completed");
    expect(event.id).toMatch(/^evt_test_/);
  });
});
