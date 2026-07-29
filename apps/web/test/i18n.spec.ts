import { describe, it, expect } from "vitest";
import { formatNumber, formatDate, formatRelativeTime, formatScore } from "@/lib/i18n";

describe("i18n Intl helpers", () => {
  it("formatNumber: pt-BR usa vírgula, en-US usa ponto", () => {
    expect(formatNumber(8.7, "pt-BR")).toBe("8,7");
    expect(formatNumber(8.7, "en-US")).toBe("8.7");
    expect(formatNumber(8.7, "es-ES")).toBe("8,7");
  });

  it("formatScore: 1 casa decimal", () => {
    expect(formatScore(7.5, "pt-BR")).toBe("7,5");
    expect(formatScore(8.2, "en-US")).toBe("8.2");
  });

  it("formatDate: formata data conforme locale", () => {
    const ds = "2026-01-15T12:00:00"; // noon UTC, safe from timezone edge
    const pt = formatDate(ds, "pt-BR");
    const en = formatDate(ds, "en-US");
    expect(pt).toBe("15/01/2026");
    expect(en).toBe("01/15/2026");
  });

  it("formatRelativeTime: usa Intl.RelativeTimeFormat", () => {
    const past = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    const rel = formatRelativeTime(past, "pt-BR");
    expect(rel).toContain("3"); // há 3 dias
  });
});
