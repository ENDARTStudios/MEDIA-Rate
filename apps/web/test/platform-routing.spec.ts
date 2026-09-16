import { describe, it, expect } from "vitest";
import { flagFromLocalEvaluation } from "@/lib/platform-routing";

/**
 * T454 (D-507) — parser do payload de local_evaluation do PostHog para a
 * flag cloudflare_migration. Puramente sintático (sem rede).
 */

const payloadCom = (flag: Record<string, unknown>) => ({ flags: [flag] });

describe("flagFromLocalEvaluation (T454)", () => {
  it("extrai rollout_percentage como número", () => {
    const valor = flagFromLocalEvaluation(
      payloadCom({
        key: "cloudflare_migration",
        active: true,
        deleted: false,
        filters: { groups: [{ rollout_percentage: 10 }] },
      }),
    );
    expect(valor).toBe(10);
  });

  it("flag ativa sem grupos → true (rollout total)", () => {
    const valor = flagFromLocalEvaluation(
      payloadCom({ key: "cloudflare_migration", active: true, deleted: false, filters: {} }),
    );
    expect(valor).toBe(true);
  });

  it("flag inativa/deletada/ausente → false (default OFF)", () => {
    expect(
      flagFromLocalEvaluation(
        payloadCom({ key: "cloudflare_migration", active: false, deleted: false }),
      ),
    ).toBe(false);
    expect(
      flagFromLocalEvaluation(
        payloadCom({ key: "cloudflare_migration", active: true, deleted: true }),
      ),
    ).toBe(false);
    expect(flagFromLocalEvaluation({ flags: [{ key: "outra", active: true }] })).toBe(false);
    expect(flagFromLocalEvaluation({})).toBe(false);
    expect(flagFromLocalEvaluation(null)).toBe(false);
  });

  it("rollout_percentage ausente/inválido → false (fail-closed)", () => {
    expect(
      flagFromLocalEvaluation(
        payloadCom({
          key: "cloudflare_migration",
          active: true,
          deleted: false,
          filters: { groups: [{}] },
        }),
      ),
    ).toBe(false);
    expect(
      flagFromLocalEvaluation(
        payloadCom({
          key: "cloudflare_migration",
          active: true,
          deleted: false,
          filters: { groups: [{ rollout_percentage: Number.NaN }] },
        }),
      ),
    ).toBe(false);
  });
});
