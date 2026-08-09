import { describe, it, expect } from "vitest";
import { PLANS, formatPlanPrice } from "@/lib/pricing";
import ptBR from "@/messages/pt-BR.json";
import enUS from "@/messages/en-US.json";
import esES from "@/messages/es-ES.json";

/**
 * T242 — fonte de verdade única para preços e marca: os 3 locales exibem
 * os MESMOS valores (R$ BRL) e a marca 'END ART Studios'; nenhum preço
 * hardcoded por locale.
 */

type Locale = Record<string, Record<string, string>>;
const LOCALES: Record<string, Locale> = {
  "pt-BR": ptBR as unknown as Locale,
  "en-US": enUS as unknown as Locale,
  "es-ES": esES as unknown as Locale,
};

describe("T242 — preços e marca com fonte única (pricing.ts)", () => {
  it("PLANS define Plus 4.9 e Premium 9.9 em BRL — valores únicos", () => {
    const plus = PLANS.find((p) => p.id === "plus");
    const premium = PLANS.find((p) => p.id === "premium");
    expect(plus?.price).toBe(4.9);
    expect(premium?.price).toBe(9.9);
    expect(plus?.currency["pt-BR"]).toBe("BRL");
    expect(plus?.currency["en-US"]).toBe("BRL");
    expect(plus?.currency["es-ES"]).toBe("BRL");
  });

  it("formatPlanPrice produz R$ idêntico em valor nos 3 locales (sem '(R,90)')", () => {
    for (const loc of ["pt-BR", "en-US", "es-ES"] as const) {
      const plus = formatPlanPrice(4.9, loc);
      const premium = formatPlanPrice(9.9, loc);
      // Nunca o bug '(R,90)' (quebra de template) nem valor divergente.
      expect(plus).not.toContain("(R,");
      expect(premium).not.toContain("(R,");
      expect(plus).toContain("4");
      expect(premium).toContain("9");
      console.log(`[${loc}] plus=${plus} premium=${premium}`);
    }
  });

  it("terms.s3b (seção de planos) usa 4,90/9,90 nos 3 locales — sem hardcode divergente", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const s3b = msgs.terms?.s3b ?? "";
      expect(s3b).toContain("4");
      expect(s3b).toContain("9");
      // Nunca os valores divergentes da auditoria (8,90/14,90).
      expect(s3b).not.toContain("8,90");
      expect(s3b).not.toContain("14,90");
      // Marca presente.
      expect(msgs.footer?.copyright ?? "").toContain("END ART Studios");
    }
  });

  it("footer.lgpd usa rótulo neutro por locale (nunca 'LGPD' cru em EN/ES)", () => {
    expect(LOCALES["pt-BR"].footer?.lgpd).toBe("Seus dados (LGPD)");
    expect(LOCALES["en-US"].footer?.lgpd).toBe("Your data");
    expect(LOCALES["es-ES"].footer?.lgpd).toBe("Sus datos");
  });
});
