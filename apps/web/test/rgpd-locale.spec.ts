import { describe, it, expect } from "vitest";
import ptBR from "@/messages/pt-BR.json";
import enUS from "@/messages/en-US.json";
import esES from "@/messages/es-ES.json";

/**
 * T248 — regimes de privacidade por locale: es-ES RGPD+AEPD sem LGPD;
 * pt-BR LGPD sem RGPD; en-US neutro sem siglas; Terms com foro Osasco/SP
 * nos 3 locales (lei regente brasileira).
 */

type Locale = Record<string, Record<string, string>>;
const LOCALES: Record<string, Locale> = {
  "pt-BR": ptBR as unknown as Locale,
  "en-US": enUS as unknown as Locale,
  "es-ES": esES as unknown as Locale,
};

describe("T248 — regimes de privacidade por locale", () => {
  it("es-ES: contém RGPD e AEPD; NÃO contém LGPD", () => {
    const p = JSON.stringify(LOCALES["es-ES"].privacy);
    expect(p).toContain("RGPD");
    expect(p).toContain("AEPD");
    expect(p).not.toContain("LGPD");
  });

  it("es-ES: bases legais (art. 6) e direitos (arts. 15-22) presentes", () => {
    const s3b = LOCALES["es-ES"].privacy.s3b ?? "";
    const s6b = LOCALES["es-ES"].privacy.s6b ?? "";
    expect(s3b).toContain("art. 6");
    expect(s6b).toContain("15");
    expect(s6b).toContain("22");
    expect(s6b).toContain("AEPD");
  });

  it("pt-BR: contém LGPD; NÃO contém RGPD nem AEPD", () => {
    const p = JSON.stringify(LOCALES["pt-BR"].privacy);
    expect(p).toContain("LGPD");
    expect(p).not.toContain("RGPD");
    expect(p).not.toContain("AEPD");
  });

  it("en-US: NÃO contém LGPD nem RGPD (nota neutra)", () => {
    const p = JSON.stringify(LOCALES["en-US"].privacy);
    expect(p).not.toContain("LGPD");
    expect(p).not.toContain("RGPD");
    expect(p).not.toContain("AEPD");
  });

  it("Terms nos 3 locales: foro Osasco/SP (lei regente brasileira)", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const t = JSON.stringify(msgs.terms ?? {});
      expect(t, `${loc} terms`).toContain("Osasco");
    }
  });

  it("nenhum locale mistura siglas de regimes diferentes na privacy", () => {
    const es = JSON.stringify(LOCALES["es-ES"].privacy);
    const pt = JSON.stringify(LOCALES["pt-BR"].privacy);
    const en = JSON.stringify(LOCALES["en-US"].privacy);
    // es-ES: RGPD e AEPD juntos são o MESMO regime (permitido); LGPD ausente.
    expect(es).not.toContain("LGPD");
    // pt-BR: só LGPD.
    expect(pt).not.toContain("RGPD");
    // en-US: nenhum.
    expect(en).not.toMatch(/LGPD|RGPD|AEPD/);
  });
});
