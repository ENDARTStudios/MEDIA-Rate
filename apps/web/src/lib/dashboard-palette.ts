/**
 * D-586 (T211/B3) — paleta LEGADA do protótipo do dashboard, em um único lugar.
 *
 * Contexto: `DashboardOverview.tsx` (1.757 linhas) carregava um segundo design
 * system embutido — 217 hex literais, 27 valores distintos, espalhados em
 * `className` arbitrários, props de gráfico (recharts), atributos de SVG e numa
 * string gigante de relatório para impressão. `design-tokens.ts` não era a fonte
 * de verdade de facto do dashboard.
 *
 * Este módulo é a **fonte única** dessa paleta: `tailwind.config.ts` importa
 * `DASH_PALETTE` para gerar as classes (`bg-dash-teal`, `text-dash-violet-light`,
 * …) e os componentes importam `DASH` para os usos que **não** são classe
 * (`stroke=`/`fill=` de SVG, `style`, configs de gráfico).
 *
 * O prefixo `dash-` é deliberado: **não é design system**, é dívida congelada e
 * visível. O mapa `CANONICO` abaixo diz qual token canônico substitui cada
 * entrada — a migração (feita tela a tela, com o gate `design:hex` segurando a
 * regressão) é um lookup, valor por valor.
 *
 * Nenhum valor aqui foi alterado: as classes geradas produzem exatamente o mesmo
 * CSS de antes, então a extração é visualmente neutra.
 */

/** Tokens canônicos mais próximos de cada cor legada (guia da migração). */
export const DASH_CANONICO: Record<string, string> = {
  "teal": "sem token — candidato a `accent.teal` (decisão do Operador)",
  "amber": "score.medium #FBBF24",
  "indigo": "accent.indigo #818CF8",
  "indigo-light": "accent.indigo (variação clara)",
  "violet": "accent.violet #A78BFA",
  "violet-light": "accent.violet (variação clara)",
  "blue": "accent.sky/critics #38BDF8",
  "coral": "score.low #F87171",
  "coral-light": "score.low (variação clara)",
  "coral-alt": "score.low (variação clara)",
  "surface": "surface.card #12121C",
  "surface-2": "surface.elevated #1B1B2C",
  "surface-3": "surface.elevated #1B1B2C",
  "surface-4": "surface.elevated #1B1B2C",
  "surface-5": "surface.card #12121C",
  "surface-6": "surface.elevated #1B1B2C",
  "surface-7": "surface.elevated #1B1B2C",
  "deep": "surface.bg #05050A",
  "deeper": "surface.bg #05050A",
  "muted": "fg.muted #85859F",
};

export const DASH_PALETTE = {
  "teal": "#62D7C5",
  "amber": "#F2C36B",
  "indigo": "#8B7CFF",
  "indigo-light": "#A69CFF",
  "violet": "#9B8CFF",
  "violet-light": "#B9B0FF",
  "blue": "#4DB6FF",
  "coral": "#FF7F66",
  "coral-light": "#FF9A86",
  "coral-alt": "#FF9B85",
  "surface": "#11111B",
  "surface-2": "#171725",
  "surface-3": "#151522",
  "surface-4": "#1A1A28",
  "surface-5": "#131320",
  "surface-6": "#181827",
  "surface-7": "#1C1C2E",
  "deep": "#0D0D14",
  "deeper": "#0B0B12",
  "muted": "#9693A8",
} as const;

/** Acesso em camelCase para os usos fora de `className` (SVG/style/gráfico). */
export const DASH = {
  teal: DASH_PALETTE.teal,
  amber: DASH_PALETTE.amber,
  indigo: DASH_PALETTE.indigo,
  indigoLight: DASH_PALETTE["indigo-light"],
  violet: DASH_PALETTE.violet,
  violetLight: DASH_PALETTE["violet-light"],
  blue: DASH_PALETTE.blue,
  coral: DASH_PALETTE.coral,
  coralLight: DASH_PALETTE["coral-light"],
  coralAlt: DASH_PALETTE["coral-alt"],
  surface: DASH_PALETTE.surface,
  surface2: DASH_PALETTE["surface-2"],
  surface3: DASH_PALETTE["surface-3"],
  surface4: DASH_PALETTE["surface-4"],
  surface5: DASH_PALETTE["surface-5"],
  surface6: DASH_PALETTE["surface-6"],
  surface7: DASH_PALETTE["surface-7"],
  deep: DASH_PALETTE.deep,
  deeper: DASH_PALETTE.deeper,
  muted: DASH_PALETTE.muted,
} as const;
