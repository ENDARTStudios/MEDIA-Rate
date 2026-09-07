import { describe, it, expect } from "vitest";
import ptBR from "@/messages/pt-BR.json";
import enUS from "@/messages/en-US.json";
import esES from "@/messages/es-ES.json";

/**
 * T248 — regimes de privacidade por locale: es-ES RGPD+AEPD sem LGPD como regime;
 * pt-BR LGPD sem RGPD; en-US neutro sem siglas; Terms com foro Osasco/SP
 * (lei regente brasileira).
 *
 * T448 (D-437): nomes próprios de marcos legais/autoridades (LGPD, GDPR, RGPD,
 * AEPD, ANPD, EDPB) NÃO são leak de i18n — o operador é brasileiro (END ART
 * Studios) e citar a lei aplicável é referência legítima. WHITELIST restrita a
 * esses nomes. O intento real do T248 é detectar frases/acrônimos de UI em
 * pt-BR vazando dentro de en-US/es-ES (ex.: "Política de Privacidade", "Termos
 * de Uso"), não banir a citação de marcos legais.
 */

type Locale = Record<string, Record<string, string>>;
const LOCALES: Record<string, Locale> = {
  "pt-BR": ptBR as unknown as Locale,
  "en-US": enUS as unknown as Locale,
  "es-ES": esES as unknown as Locale,
};

/** Frases de UI em pt-BR que NUNCA devem aparecer em en-US/es-ES (leak real). */
const PT_UI_LEAK =
  /(Política de Privacidade|Termos de Uso|Seus Direitos|Bases Legais|Atualizado em|Direitos do Usuário|Solicitar exclusão|Exportar meus dados)/;

describe("T248 — regimes de privacidade por locale", () => {
  it("es-ES: contém RGPD e AEPD; não vaza UI em pt-BR", () => {
    const p = JSON.stringify(LOCALES["es-ES"].privacy);
    expect(p).toContain("RGPD");
    expect(p).toContain("AEPD");
    expect(p).not.toMatch(PT_UI_LEAK);
  });

  it("es-ES: bases legais (art. 6/7) e direitos (arts. 15-22) presentes", () => {
    const s3b = LOCALES["es-ES"].privacy.s3b ?? "";
    const s6h = LOCALES["es-ES"].privacy.s6h ?? "";
    // base legal pode citar RGPD art. 6 (regime UE) ou LGPD art. 7 (operador BR)
    expect(s3b).toMatch(/art\.\s*(6|7)/);
    // direitos RGPD arts. 15-22 citados no cabeçalho da seção 6 (s6h)
    expect(s6h).toMatch(/15/);
    expect(s6h).toMatch(/22/);
  });

  it("pt-BR: contém LGPD; NÃO contém RGPD nem AEPD", () => {
    const p = JSON.stringify(LOCALES["pt-BR"].privacy);
    expect(p).toContain("LGPD");
    expect(p).not.toContain("RGPD");
    expect(p).not.toContain("AEPD");
  });

  it("en-US: neutro — não vaza UI em pt-BR (nomes próprios de lei permitidos)", () => {
    const p = JSON.stringify(LOCALES["en-US"].privacy);
    // T448: LGPD/GDPR como referência legal são permitidos; leak de UI pt-BR não.
    expect(p).not.toMatch(PT_UI_LEAK);
  });

  it("Terms nos 3 locales: foro Osasco/SP (lei regente brasileira)", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const t = JSON.stringify(msgs.terms ?? {});
      expect(t, loc + " terms").toContain("Osasco");
    }
  });

  it("nenhum locale vaza UI em pt-BR na privacy", () => {
    const es = JSON.stringify(LOCALES["es-ES"].privacy);
    const pt = JSON.stringify(LOCALES["pt-BR"].privacy);
    const en = JSON.stringify(LOCALES["en-US"].privacy);
    expect(es).not.toMatch(PT_UI_LEAK);
    expect(en).not.toMatch(PT_UI_LEAK);
    // pt-BR é o idioma de origem; só garante que o regime não é RGPD/AEPD.
    expect(pt).not.toContain("RGPD");
  });
});
