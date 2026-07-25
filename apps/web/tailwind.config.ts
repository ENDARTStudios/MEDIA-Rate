import type { Config } from "tailwindcss";

const config: Config = {
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
          DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))",
          50: "#E8EAF1", 100: "#C5C8DC", 200: "#9DA1C2", 300: "#767BA8",
          400: "#565C93", 500: "#3D4380", 600: "#2B306A", 700: "#1D2154",
          800: "#13173E", 900: "#0F0F23", 950: "#080812",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))",
          50: "#EDEBF4", 100: "#D1CEDE", 200: "#B1ABC4", 300: "#9188AA",
          400: "#7A7096", 500: "#635883", 600: "#514771", 700: "#3E365E",
          800: "#2D274A", 900: "#1E1B4B", 950: "#131031",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))",
          50: "#FFF1F2", 100: "#FFE4E6", 200: "#FECDD3", 300: "#FDA4AF",
          400: "#FB7185", 500: "#F43F5E", 600: "#E11D48", 700: "#BE123C",
          800: "#9F1239", 900: "#881337", 950: "#4C0519",
        },
        surface: { bg: "#000000", card: "#12141D", elevated: "#181825", overlay: "rgba(0,0,0,0.85)", ring: "#312E81", border: "#1E2040" },
        score: { high: "#22C55E", medium: "#EAB308", low: "#EF4444" },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))", foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))", "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))", "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))", ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: { heading: ["Inter", "sans-serif"], body: ["Inter", "sans-serif"], mono: ["JetBrains Mono", "Fira Code", "monospace"] },
      fontSize: {
        display: ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "700" }],
        h2: ["2rem", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        h3: ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" }],
        h4: ["1.25rem", { lineHeight: "1.35", fontWeight: "600" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.01em" }],
        label: ["0.75rem", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
        overline: ["0.625rem", { lineHeight: "1", letterSpacing: "0.1em", fontWeight: "700" }],
      },
      screens: { xs: "360px" },
      boxShadow: {
        "surface-1": "0 1px 2px rgba(0,0,0,0.4)",
        "surface-2": "0 2px 8px rgba(0,0,0,0.5)",
        "surface-3": "0 4px 16px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.06)",
        floating: "0 8px 32px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.08)",
        "glow-accent": "0 0 30px rgba(225,29,72,0.25), 0 0 8px rgba(225,29,72,0.1)",
        "glow-primary": "0 0 30px rgba(15,15,35,0.4), 0 0 8px rgba(29,33,84,0.2)",
        "glow-high": "0 0 20px rgba(34,197,94,0.3)",
        "glow-medium": "0 0 20px rgba(234,179,8,0.3)",
        "glow-low": "0 0 20px rgba(239,68,68,0.3)",
      },
      borderRadius: { "2xl": "1rem", "3xl": "1.5rem" },
      transitionDuration: { fast: "150ms", normal: "250ms", slow: "400ms", page: "350ms" },
      transitionTimingFunction: { "out-expo": "cubic-bezier(0,0,0.2,1)", "in-out": "cubic-bezier(0.25,0.1,0.25,1)" },
      blur: { sm: "4px", md: "8px", lg: "16px" },
      zIndex: { dropdown: "10", sticky: "20", drawer: "30", modal: "40", popover: "50", tooltip: "60", toast: "70" },
    },
  },
  plugins: [],
};

export default config;
