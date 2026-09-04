import { describe, it, expect, afterEach, vi } from "vitest";
import { annualAvailable } from "@/lib/billing-config";

describe("annualAvailable (T447 — guarda defensiva do toggle anual)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("false quando nenhum STRIPE_PRICE_*_YEAR_* está configurado", () => {
    vi.stubEnv("STRIPE_PRICE_PLUS_YEAR_BRL", "");
    vi.stubEnv("STRIPE_PRICE_PREMIUM_YEAR_USD", "");
    expect(annualAvailable()).toBe(false);
  });

  it("true quando existe ao menos um STRIPE_PRICE_*_YEAR_*", () => {
    vi.stubEnv("STRIPE_PRICE_PLUS_YEAR_BRL", "");
    vi.stubEnv("STRIPE_PRICE_PREMIUM_YEAR_USD", "price_premium_year_usd");
    expect(annualAvailable()).toBe(true);
  });
});
