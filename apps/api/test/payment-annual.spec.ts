import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PaymentController } from "../src/modules/payment/payment.controller.js";

describe("T447 — guarda defensiva do checkout anual", () => {
  const svc = { createCheckout: vi.fn(), cancelar: vi.fn(), processWebhook: vi.fn() };
  let controller: PaymentController;

  beforeEach(() => {
    svc.createCheckout.mockReset();
    controller = new PaymentController(svc as unknown as never);
  });
  afterEach(() => vi.unstubAllEnvs());

  function req() {
    return {
      user: { id: "u1", email: "u@example.com" },
      headers: { "x-locale": "pt-BR" },
    } as never;
  }

  it("rejeita checkout anual (BadRequest/422) se STRIPE_PRICE_*_YEAR_* ausente", async () => {
    vi.stubEnv("STRIPE_PRICE_PLUS_YEAR_BRL", "");
    await expect(
      controller.createCheckout(
        { plano: "PLUS", success_url: "s", cancel_url: "c", currency: "BRL", periodo: "year" },
        req(),
      ),
    ).rejects.toThrow(/anual/);
    expect(svc.createCheckout).not.toHaveBeenCalled();
  });

  it("permite checkout anual se STRIPE_PRICE_*_YEAR_* presente", async () => {
    vi.stubEnv("STRIPE_PRICE_PLUS_YEAR_BRL", "price_plus_year_brl");
    svc.createCheckout.mockResolvedValue({
      id: "cs_x",
      url: "https://stripe.test",
      plano: "PLUS",
    });
    const r = await controller.createCheckout(
      { plano: "PLUS", success_url: "s", cancel_url: "c", currency: "BRL", periodo: "year" },
      req(),
    );
    expect(svc.createCheckout).toHaveBeenCalledTimes(1);
    expect(r.url).toContain("https://stripe.test");
  });
});
