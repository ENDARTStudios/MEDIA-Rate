import { describe, it, expect } from "vitest";
import { scoreColor, colors } from "@/lib/design-tokens";

/**
 * WCAG 2.1 — Relative luminance formula.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toSRGB = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toSRGB(r) + 0.7152 * toSRGB(g) + 0.0722 * toSRGB(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const BG = "#09090F";
const SURFACE = "#11111E";
/** Superfície elevada real do produto (`colors.ce` / `bg-[#1B1B2C]`). */
const ELEVATED = "#1B1B2C";
const AA_MIN = 4.5;

describe("T210 — escala de texto muted/secundário passa AA em TODAS as superfícies", () => {
  // Regressão do débito que o detector de DOM apontou nos badges de contagem do
  // catálogo: #80809B sobre #1B1B2C dava 4.42:1 (reprova). O token muted subiu
  // para #85859F e agora passa nas três superfícies — este teste impede que
  // alguém reintroduza um muted que só funcione sobre o fundo.
  const superficies: [string, string][] = [
    ["fundo home", BG],
    ["card", SURFACE],
    ["elevado", ELEVATED],
  ];

  for (const [nome, hex] of superficies) {
    it(`text.muted (${colors.text.muted}) sobre ${nome} — >= ${AA_MIN}`, () => {
      const ratio = contrastRatio(colors.text.muted, hex);
      expect(ratio, `muted vs ${nome}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_MIN);
    });

    it(`text.secondary (${colors.text.secondary}) sobre ${nome} — >= ${AA_MIN}`, () => {
      const ratio = contrastRatio(colors.text.secondary, hex);
      expect(ratio, `secondary vs ${nome}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_MIN);
    });
  }
});

/**
 * D-582.7 — `text.onBrand` é a exceção registrada ao D-065 ("texto #FFFFFF"):
 * existe **apenas** para fundo de marca, e só porque o token canônico reprova ali.
 * Este teste fixa a razão da exceção: se alguém clarear o rose até `#F5F5F7`
 * passar, o teste continua válido (onBrand segue passando); se alguém trocar o
 * CTA para `text.primary`, o par abaixo documenta por que não pode.
 */
describe("D-582.7 — texto sobre fundo de marca passa AA (e o token comum não)", () => {
  // Só o rose da marca (#E11D48) é escuro o bastante para receber texto branco.
  // Preenchimentos claros (amber #F59E0B, red-400 #F87171) reprovam com branco
  // (2.15:1 e 2.93:1) e exigem texto escuro `colors.bg` — por isso o token
  // `onBrand` tem escopo declarado: **fundo rose da marca**.
  it(`text.onBrand (${colors.text.onBrand}) sobre accent.brand — >= ${AA_MIN}`, () => {
    const ratio = contrastRatio(colors.text.onBrand, colors.accent.brand);
    expect(ratio, `onBrand vs brand: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_MIN);
  });

  it("justifica a exceção: text.primary reprova sobre o rose da marca", () => {
    const ratio = contrastRatio(colors.text.primary, colors.accent.brand);
    expect(
      ratio,
      `text.primary sobre brand: ${ratio.toFixed(2)} (se passou, dá para aposentar o onBrand)`,
    ).toBeLessThan(AA_MIN);
  });

  it("preenchimentos claros de score exigem texto escuro (não usar onBrand)", () => {
    const sobreAmber = contrastRatio(colors.text.onBrand, colors.score[6]);
    expect(
      sobreAmber,
      `onBrand sobre amber: ${sobreAmber.toFixed(2)} — usar colors.bg como texto`,
    ).toBeLessThan(AA_MIN);
    const bgSobreAmber = contrastRatio(colors.bg, colors.score[6]);
    expect(bgSobreAmber, `bg sobre amber: ${bgSobreAmber.toFixed(2)}`).toBeGreaterThanOrEqual(
      AA_MIN,
    );
  });
});

const SCORE_FAIXAS: { label: string; hex: string }[] = [
  { label: ">=9 (emerald)", hex: colors.score[9] },
  { label: ">=8 (sky)", hex: colors.score[8] },
  { label: ">=7 (indigo)", hex: colors.score[7] },
  { label: ">=6 (amber)", hex: colors.score[6] },
  { label: ">=5 (orange)", hex: colors.score[5] },
  { label: "<5 (red)", hex: colors.score.low },
];

describe("V1.3 §1.2 — Contraste AA das 6 faixas de score", () => {
  for (const faixa of SCORE_FAIXAS) {
    it(`${faixa.label} ${faixa.hex} contra ${BG} — ratio >= ${AA_MIN}`, () => {
      const ratio = contrastRatio(faixa.hex, BG);
      expect(
        ratio,
        `${faixa.label} ${faixa.hex} vs ${BG}: ratio=${ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(AA_MIN);
    });

    it(`${faixa.label} ${faixa.hex} contra ${SURFACE} — ratio >= ${AA_MIN}`, () => {
      const ratio = contrastRatio(faixa.hex, SURFACE);
      expect(
        ratio,
        `${faixa.label} ${faixa.hex} vs ${SURFACE}: ratio=${ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(AA_MIN);
    });
  }
});

describe("V1.3 §1.2 — getScoreColor é a ÚNICA fonte de cor de score", () => {
  it("retorna os 6 hex esperados para scores representativos (0-10)", () => {
    const cases: [number, string][] = [
      [9.5, colors.score[9]],
      [8.2, colors.score[8]],
      [7.0, colors.score[7]],
      [6.8, colors.score[6]],
      [5.1, colors.score[5]],
      [4.0, colors.score.low],
      [0, colors.score.low],
    ];
    for (const [score, expected] of cases) {
      expect(scoreColor(score, "0-10"), `score=${score}`).toBe(expected);
    }
  });

  it("retorna os 6 hex esperados para scores representativos (0-100)", () => {
    const cases: [number, string][] = [
      [95, colors.score[9]],
      [82, colors.score[8]],
      [70, colors.score[7]],
      [68, colors.score[6]],
      [51, colors.score[5]],
      [40, colors.score.low],
      [0, colors.score.low],
    ];
    for (const [score, expected] of cases) {
      expect(scoreColor(score, "0-100"), `score=${score}`).toBe(expected);
    }
  });

  it("cobre todos os limiares de troca de faixa", () => {
    expect(scoreColor(9, "0-10")).toBe(colors.score[9]);
    expect(scoreColor(8.9, "0-10")).toBe(colors.score[8]);
    expect(scoreColor(8, "0-10")).toBe(colors.score[8]);
    expect(scoreColor(7.9, "0-10")).toBe(colors.score[7]);
    expect(scoreColor(7, "0-10")).toBe(colors.score[7]);
    expect(scoreColor(6.9, "0-10")).toBe(colors.score[6]);
    expect(scoreColor(6, "0-10")).toBe(colors.score[6]);
    expect(scoreColor(5.9, "0-10")).toBe(colors.score[5]);
    expect(scoreColor(5, "0-10")).toBe(colors.score[5]);
    expect(scoreColor(4.9, "0-10")).toBe(colors.score.low);
  });

  // D-526 — cores canônicas de mídia usadas como TEXTO/rótulo (biblioteca,
  // taxonomia, pulso) sobre as superfícies escuras do app: AA obrigatório.
  it("cores canônicas de mídia têm contraste AA sobre fundo e card", () => {
    const midias: [string, string][] = Object.entries(colors.media);
    expect(midias).toHaveLength(6);
    for (const [nome, hex] of midias) {
      expect(contrastRatio(hex, BG), `${nome} sobre BG`).toBeGreaterThanOrEqual(AA_MIN);
      expect(contrastRatio(hex, SURFACE), `${nome} sobre card`).toBeGreaterThanOrEqual(AA_MIN);
    }
  });
});
