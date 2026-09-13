import { describe, it, expect, vi } from "vitest";
import { flagAtiva, capturarEvento, FEATURE_FLAGS } from "@/lib/posthog";

/**
 * T452 — helper de feature flags do PostHog. Fallback seguro (OFF) e no-op
 * sem SDK, para o rollout da migracao Cloudflare nunca quebrar a UI.
 */
describe("T452 — posthog feature flags", () => {
  it("flag cloudflare_migration existe e default OFF sem SDK", () => {
    expect(FEATURE_FLAGS.CLOUDFLARE_MIGRATION).toBe("cloudflare_migration");
    expect(flagAtiva(null, FEATURE_FLAGS.CLOUDFLARE_MIGRATION)).toBe(false);
    expect(flagAtiva(undefined, FEATURE_FLAGS.CLOUDFLARE_MIGRATION)).toBe(false);
  });

  it("isFeatureEnabled booleano tem prioridade", () => {
    const ph = { isFeatureEnabled: vi.fn(() => true) };
    expect(flagAtiva(ph, FEATURE_FLAGS.CLOUDFLARE_MIGRATION)).toBe(true);
  });

  it("getFeatureFlag aceita boolean e variantes string", () => {
    expect(flagAtiva({ getFeatureFlag: () => true }, FEATURE_FLAGS.CLOUDFLARE_MIGRATION)).toBe(
      true,
    );
    expect(flagAtiva({ getFeatureFlag: () => "false" }, FEATURE_FLAGS.CLOUDFLARE_MIGRATION)).toBe(
      false,
    );
    expect(flagAtiva({ getFeatureFlag: () => "control" }, FEATURE_FLAGS.CLOUDFLARE_MIGRATION)).toBe(
      true,
    );
  });

  it("erro do SDK cai no fallback (nunca lanca)", () => {
    const ph = {
      isFeatureEnabled: () => {
        throw new Error("boom");
      },
    };
    expect(flagAtiva(ph, FEATURE_FLAGS.CLOUDFLARE_MIGRATION, true)).toBe(true);
  });

  it("capturarEvento é no-op sem SDK e delega quando presente", () => {
    expect(() => capturarEvento(null, "trial_started")).not.toThrow();
    const capture = vi.fn();
    capturarEvento({ capture }, "checkout_completed", { plan: "PLUS" });
    expect(capture).toHaveBeenCalledWith("checkout_completed", { plan: "PLUS" });
  });
});
