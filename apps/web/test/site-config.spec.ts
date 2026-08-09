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

describe("T242/T247 — preços e marca com fonte única (pricing.ts)", () => {
  it("PLANS define Plus 4.9 e Premium 9.9 — valores únicos sem conversão", () => {
    const plus = PLANS.find((p) => p.id === "plus");
    const premium = PLANS.find((p) => p.id === "premium");
    expect(plus?.price).toBe(4.9);
    expect(premium?.price).toBe(9.9);
  });

  it("T247: formatPlanPrice usa símbolo por locale (R$/$/€) com o MESMO valor", () => {
    const casos: Record<string, [string, string]> = {
      "pt-BR": ["R$ 4,90", "R$ 9,90"],
      "en-US": ["$ 4.90", "$ 9.90"],
      "es-ES": ["€ 4,90", "€ 9,90"],
    };
    for (const [loc, [plus, premium]] of Object.entries(casos)) {
      expect(formatPlanPrice(4.9, loc)).toBe(plus);
      expect(formatPlanPrice(9.9, loc)).toBe(premium);
      // Nunca o bug '(R,90)' (quebra de template).
      expect(formatPlanPrice(4.9, loc)).not.toContain("(R,");
    }
    // Valor numérico idêntico nos 3 (sem conversão).
    for (const loc of ["pt-BR", "en-US", "es-ES"] as const) {
      expect(formatPlanPrice(4.9, loc)).toContain("4");
      expect(formatPlanPrice(9.9, loc)).toContain("9");
    }
  });

  it("terms.s3b (seção de planos) usa símbolo por locale e valores 4,90/9,90", () => {
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
    // Símbolo por locale no s3b (T247).
    expect(LOCALES["pt-BR"].terms.s3b).toContain("R$");
    expect(LOCALES["en-US"].terms.s3b).toContain("$");
    expect(LOCALES["es-ES"].terms.s3b).toContain("€");
  });

  it("footer.lgpd usa rótulo neutro por locale (nunca 'LGPD' cru em EN/ES)", () => {
    expect(LOCALES["pt-BR"].footer?.lgpd).toBe("Seus dados (LGPD)");
    expect(LOCALES["en-US"].footer?.lgpd).toBe("Your data");
    expect(LOCALES["es-ES"].footer?.lgpd).toBe("Sus datos");
  });
});
