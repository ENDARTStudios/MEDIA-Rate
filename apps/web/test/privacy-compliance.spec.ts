import { describe, it, expect } from "vitest";
import ptBR from "@/messages/pt-BR.json";
import enUS from "@/messages/en-US.json";
import esES from "@/messages/es-ES.json";

/**
 * T250 — gaps jurídicos mínimos: transferência internacional, autoridade
 * de proteção, direito de reclamar, representante UE (es-ES), disclaimer.
 */

type Locale = Record<string, Record<string, string>>;
const LOCALES: Record<string, Locale> = {
  "pt-BR": ptBR as unknown as Locale,
  "en-US": enUS as unknown as Locale,
  "es-ES": esES as unknown as Locale,
};

describe("T250 — compliance mínimo da privacy", () => {
  it("3 locales têm seções de transferência internacional (s9h)", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const s9h = msgs.privacy.s9h ?? "";
      expect(s9h.toLowerCase(), `${loc} s9h`).toMatch(/transfer/);
    }
  });

  it("3 locales têm autoridade de proteção (s10h) e direito de reclamar (s11h)", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      expect(msgs.privacy.s10h ?? "", `${loc} s10h`).toMatch(/autoridad|authority/i);
      expect(msgs.privacy.s11h ?? "", `${loc} s11h`).toMatch(/reclam|complaint/i);
    }
  });

  it("pt-BR cita ANPD", () => {
    expect(JSON.stringify(LOCALES["pt-BR"].privacy)).toContain("ANPD");
  });

  it("es-ES tem seção de representante na UE (s12)", () => {
    const es = JSON.stringify(LOCALES["es-ES"].privacy);
    expect(es).toContain("representante");
    expect(es).toContain("27.2");
  });

  it("3 locales têm disclaimer informativo (s12b — pt-BR) / s12b — en/es", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const s12b = msgs.privacy.s12b ?? "";
      expect(s12b.length, `${loc} s12b não vazio`).toBeGreaterThan(10);
    }
  });

  it("12 seções em cada locale (s1..s12)", () => {
    for (const [loc, msgs] of Object.entries(LOCALES)) {
      const secoes = Object.keys(msgs.privacy).filter((k) => /^s\d+h$/.test(k)).length;
      expect(secoes, `${loc}`).toBe(12);
    }
  });
});
