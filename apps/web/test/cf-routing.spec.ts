import { describe, it, expect } from "vitest";
import { bucketDoUsuario, decidirPlataforma } from "@/lib/cf-routing";

/**
 * T463 (D-493) — função pura de decisão de plataforma (rollout Cloudflare).
 * Sem PostHog, sem runtime Next: regra + bucket determinístico.
 */

describe("bucketDoUsuario", () => {
  it("produz bucket 0-99 estável para o mesmo distinctId", () => {
    const primeiro = bucketDoUsuario("user-abc-123");
    for (let i = 0; i < 10; i++) {
      expect(bucketDoUsuario("user-abc-123")).toBe(primeiro);
    }
    expect(primeiro).toBeGreaterThanOrEqual(0);
    expect(primeiro).toBeLessThanOrEqual(99);
  });

  it("ids distintos produzem buckets distintos (distribuição)", () => {
    const buckets = new Set(Array.from({ length: 200 }, (_, i) => bucketDoUsuario(`user-${i}`)));
    // 200 ids devem ocupar bem mais que 50 buckets distintos (hash sadio).
    expect(buckets.size).toBeGreaterThan(50);
  });
});

describe("decidirPlataforma (T463)", () => {
  it("default OFF: false/null/undefined → Vercel", () => {
    expect(decidirPlataforma(false, "user-1")).toBe(false);
    expect(decidirPlataforma(null, "user-1")).toBe(false);
    expect(decidirPlataforma(undefined, "user-1")).toBe(false);
  });

  it("true → Cloudflare para qualquer usuário", () => {
    expect(decidirPlataforma(true, "user-1")).toBe(true);
    expect(decidirPlataforma(true, "")).toBe(true);
  });

  it("0% → Vercel; 100% → Cloudflare", () => {
    for (let i = 0; i < 50; i++) {
      expect(decidirPlataforma(0, `user-${i}`)).toBe(false);
      expect(decidirPlataforma(100, `user-${i}`)).toBe(true);
    }
  });

  it("valores inválidos → fail-closed (Vercel)", () => {
    expect(decidirPlataforma(Number.NaN, "user-1")).toBe(false);
    expect(decidirPlataforma(Number.POSITIVE_INFINITY, "user-1")).toBe(false);
    expect(decidirPlataforma(-5, "user-1")).toBe(false);
    expect(decidirPlataforma(150, "user-1")).toBe(true); // >=100 trata como total
    // string não está no contrato — fail-closed
    expect(decidirPlataforma("10" as never, "user-1")).toBe(false);
  });

  it("10%: distribuição ~10% em amostra grande (8-12%)", () => {
    const total = 10_000;
    let cloudflare = 0;
    for (let i = 0; i < total; i++) {
      if (decidirPlataforma(10, `user-${i}`)) cloudflare++;
    }
    const pct = (cloudflare / total) * 100;
    expect(pct).toBeGreaterThanOrEqual(8);
    expect(pct).toBeLessThanOrEqual(12);
  });

  it("50%: distribuição ~metade (45-55%)", () => {
    const total = 10_000;
    let cloudflare = 0;
    for (let i = 0; i < total; i++) {
      if (decidirPlataforma(50, `user-${i}`)) cloudflare++;
    }
    const pct = (cloudflare / total) * 100;
    expect(pct).toBeGreaterThanOrEqual(45);
    expect(pct).toBeLessThanOrEqual(55);
  });

  it("estabilidade: o mesmo usuário nunca troca de lado no mesmo percentual", () => {
    const decisoesIniciais = Array.from({ length: 500 }, (_, i) =>
      decidirPlataforma(25, `user-${i}`),
    );
    const decisoesRepetidas = Array.from({ length: 500 }, (_, i) =>
      decidirPlataforma(25, `user-${i}`),
    );
    expect(decisoesRepetidas).toEqual(decisoesIniciais);
  });

  it("monotonicidade: quem entra em 10% permanece em 50% e 100% (mesmo bucket)", () => {
    for (let i = 0; i < 500; i++) {
      const id = `user-${i}`;
      if (decidirPlataforma(10, id)) {
        expect(decidirPlataforma(50, id)).toBe(true);
        expect(decidirPlataforma(90, id)).toBe(true);
      }
    }
  });
});
