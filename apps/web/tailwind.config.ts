import type { Config } from "tailwindcss";
// D-586: paleta legada do dashboard em módulo único (fonte para classes e p/ JS).
import { DASH_PALETTE } from "./src/lib/dashboard-palette";

const config: Config = {
  // D-651 (Tailwind 4): `future.hoverOnlyWhenSupported` virou comportamento padrao do v4
  // (hover so em ponteiro que suporta) — a flag saiu.
  // D-582.1 (T211): o app e dark-only (tokens fixos em globals.css) e o layout ja
  // renderiza <html class="dark">. Sem esta linha o Tailwind usa a estrategia
  // `media` e as 108 variantes `dark:` do admin/TOP/checkout respondiam ao tema do
  // SO — com o SO em modo claro, titulos `text-gray-900` ficavam em 1,05:1 sobre o
  // fundo escuro. Com `class`, o `dark` do <html> manda e as variantes acendem.
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(0 0% 98%)" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          critics: { DEFAULT: "#38BDF8", foreground: "#0F172A" },
          audience: { DEFAULT: "#E11D48", foreground: "#FFFFFF" },
          // `hover` (#A5B4FC) é o par claro do índigo: existia como hex solto em
          // ~20 links/CTAs (`text-[#818CF8] hover:text-[#A5B4FC]`), sempre no
          // mesmo par. Vira token para a migração das páginas não repetir o literal.
          indigo: { DEFAULT: "#818CF8", foreground: "#0F172A", hover: "#A5B4FC" },
          brand: { DEFAULT: "#E11D48", foreground: "#FFFFFF" },
          sky: { DEFAULT: "#38BDF8", foreground: "#0F172A" },
          emerald: { DEFAULT: "#34D399", foreground: "#0F172A" },
          amber: { DEFAULT: "#FBBF24", foreground: "#0F172A" },
          pink: { DEFAULT: "#F472B6", foreground: "#0F172A" },
          violet: { DEFAULT: "#A78BFA", foreground: "#0F172A" },
        },
        brand: { DEFAULT: "#E11D48", foreground: "#FFFFFF" },
        media: {
          movie: "#818CF8",
          series: "#38BDF8",
          game: "#34D399",
          book: "#FBBF24",
          comic: "#F472B6",
          manga: "#A78BFA",
        },
        surface: {
          bg: "#05050A",
          card: "#12121C",
          elevated: "#1B1B2C",
          overlay: "rgba(5,5,10,0.92)",
          border: "#2A2A3D",
          ring: "#818CF8",
        },
        score: {
          9: "#34D399",
          8: "#38BDF8",
          7: "#818CF8",
          6: "#F59E0B",
          5: "#F97316",
          low: "#F87171",
          high: "#34D399",
          medium: "#FBBF24",
        },
        sidebar: {
          "DEFAULT": "hsl(var(--sidebar))",
          "foreground": "hsl(var(--sidebar-foreground))",
          "primary": "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          "accent": "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          "border": "hsl(var(--sidebar-border))",
          "ring": "hsl(var(--sidebar-ring))",
        },
        /**
         * D-586 (T211/B3): escala canônica de texto como CLASSE (`text-fg-muted`),
         * espelhando `design-tokens.ts` — era o que faltava para o dashboard poder
         * usar o token em vez de `text-[#85859F]` (mesmo valor, zero mudança visual).
         */
        fg: {
          primary: "#F5F5F7",
          secondary: "#A0A0B8",
          muted: "#85859F",
        },
        /**
         * D-586 (T211/B3) — paleta LEGADA do protótipo do dashboard, declarada uma
         * única vez aqui em vez de espalhada em 217 `className` arbitrários. O
         * prefixo `dash-` é deliberado: **não** é design system, é dívida
         * congelada e visível. A coluna da direita do mapa abaixo é o token
         * canônico mais próximo — a migração é um lookup, valor por valor.
         *
         *   dash-teal #62D7C5      → (candidato a novo token `accent.teal`)
         *   dash-amber #F2C36B     → score.medium #FBBF24
         *   dash-indigo #8B7CFF    → accent.indigo #818CF8
         *   dash-indigo-light #A69CFF / dash-violet #9B8CFF / dash-violet-light #B9B0FF
         *                          → accent.violet #A78BFA
         *   dash-blue #4DB6FF      → accent.sky #38BDF8
         *   dash-coral #FF7F66 / dash-coral-light #FF9A86 → score.low #F87171
         *   dash-surface* #11111B/#171725/#151522/#1A1A28/#131320/#181827
         *                          → surface.card #12121C / surface.elevated #1B1B2C
         *   dash-deep #0D0D14 / dash-deeper #0B0B12 → surface.bg #05050A
         *   dash-muted #9693A8     → fg.muted #85859F
         */
        dash: DASH_PALETTE,
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Space Grotesk", "sans-serif"],
        display: ["var(--font-heading)", "Space Grotesk", "sans-serif"],
        body: ["var(--font-sans)", "Inter", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "score-xl": ["4.5rem", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "700" }],
        "score-lg": ["3rem", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "700" }],
        "score-md": ["2rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "score-sm": ["1.25rem", { lineHeight: "1", letterSpacing: "-0.01em", fontWeight: "700" }],
        "display": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "h1": ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" }],
        "h2": ["2rem", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        "h3": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" }],
        "h4": ["1.25rem", { lineHeight: "1.35", fontWeight: "600" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "caption": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.01em" }],
        "label": ["0.75rem", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "500" }],
        "overline": ["0.625rem", { lineHeight: "1", letterSpacing: "0.1em", fontWeight: "600" }],
      },
      screens: { xs: "360px" },
      boxShadow: {
        "surface-1": "0 1px 2px rgba(0,0,0,0.4)",
        "surface-2": "0 2px 8px rgba(0,0,0,0.5)",
        "surface-3": "0 4px 16px rgba(0,0,0,0.6), 0 0 1px rgba(129,140,248,0.06)",
        "floating": "0 8px 32px rgba(0,0,0,0.7), 0 0 1px rgba(129,140,248,0.08)",
      },
      borderRadius: { md: "0.375rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      transitionDuration: { fast: "150ms", normal: "200ms", slow: "400ms", page: "300ms" },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0,0,0.2,1)",
        "in-out": "cubic-bezier(0.25,0.1,0.25,1)",
      },
      zIndex: {
        dropdown: "10",
        sticky: "20",
        drawer: "30",
        modal: "40",
        popover: "50",
        tooltip: "60",
        toast: "70",
      },
    },
  },
  plugins: [],
};

export default config;
