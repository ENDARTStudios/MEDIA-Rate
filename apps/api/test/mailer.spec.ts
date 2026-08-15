import { describe, it, expect, vi } from "vitest";
import { MailTemplateService } from "../src/modules/mailer/mail-template.service.js";
import { MailerService, type MailTransport } from "../src/modules/mailer/mailer.service.js";
import { PaymentService } from "../src/modules/payment/payment.service.js";
import { MockPaymentGateway } from "../src/modules/payment/adapter/mock-payment.gateway.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import type { MailerService as MailerServiceType } from "../src/modules/mailer/mailer.service.js";

describe("MailTemplateService (T341)", () => {
  it("renderiza trial_will_end com variáveis de HTML escapadas", () => {
    const svc = new MailTemplateService();
    const r = svc.render("trial_will_end", { plano: "<script>alert(1)</script>" });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.subject).toContain("<script>"); // subject é texto puro (var controlada)
  });

  it("lança para template desconhecido", () => {
    const svc = new MailTemplateService();
    expect(() => svc.render("inexistente" as never, {})).toThrow(/desconhecido/);
  });
});

describe("MailerService (T341)", () => {
  function buildMailer(send: MailTransport["send"]) {
    const transport: MailTransport = { send };
    return new MailerService(new MailTemplateService(), transport);
  }

  it("envia email e deduplica por destinatário+tipo (24h)", async () => {
    const send = vi.fn(async () => undefined);
    const svc = buildMailer(send);
    const r1 = await svc.enviar("trial_will_end", "a@b.com", { plano: "Plus" });
    const r2 = await svc.enviar("trial_will_end", "a@b.com", { plano: "Plus" });
    expect(r1.enviado).toBe(true);
    expect(r2.enviado).toBe(false); // dedupe
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("tipos diferentes para o mesmo destinatário não deduplicam", async () => {
    const send = vi.fn(async () => undefined);
    const svc = buildMailer(send);
    await svc.enviar("trial_will_end", "a@b.com", { plano: "Plus" });
    const r = await svc.enviar("subscription_cancelled", "a@b.com", {});
    expect(r.enviado).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("PaymentService — notificação de email (T341)", () => {
  it("trial_will_end dispara email trial_will_end para o usuário", async () => {
    const prisma = {
      eventoPagamento: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: "evt" })),
        update: vi.fn(async () => ({})),
      },
      usuarioPlano: { update: vi.fn(async () => ({})) },
      usuario: { findUnique: vi.fn(async () => ({ email: "u@e.com" })) },
    } as unknown as PrismaService;
    const mailer = {
      enviar: vi.fn(async () => ({ enviado: true })),
    } as unknown as MailerServiceType;
    const service = new PaymentService(prisma, new MockPaymentGateway(), mailer);

    const payload = JSON.stringify({
      type: "customer.subscription.trial_will_end",
      data: { object: { metadata: { usuario_id: "u1" } } },
    });
    await service.processWebhook(payload, "sig");

    expect(mailer.enviar).toHaveBeenCalledWith("trial_will_end", "u@e.com", { plano: "Plus" });
  });

  it("sem mailer injetado não chama prisma.usuario (sem quebrar)", async () => {
    const prisma = {
      eventoPagamento: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: "evt" })),
        update: vi.fn(async () => ({})),
      },
      usuarioPlano: { update: vi.fn(async () => ({})) },
      usuario: { findUnique: vi.fn() },
    } as unknown as PrismaService;
    const service = new PaymentService(prisma, new MockPaymentGateway());

    const payload = JSON.stringify({
      type: "customer.subscription.trial_will_end",
      data: { object: { metadata: { usuario_id: "u1" } } },
    });
    await service.processWebhook(payload, "sig");

    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });
});
