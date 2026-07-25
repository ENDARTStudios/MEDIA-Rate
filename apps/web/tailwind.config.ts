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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(0 0% 98%)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#E8EAF1",
          100: "#C5C8DC",
          200: "#9DA1C2",
          300: "#767BA8",
          400: "#565C93",
          500: "#3D4380",
          600: "#2B306A",
          700: "#1D2154",
          800: "#13173E",
          900: "#0F0F23",
          950: "#080812",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          50: "#EDEBF4",
          100: "#D1CEDE",
          200: "#B1ABC4",
          300: "#9188AA",
          400: "#7A7096",
          500: "#635883",
          600: "#514771",
          700: "#3E365E",
          800: "#2D274A",
          900: "#1E1B4B",
          950: "#131031",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
          700: "#BE123C",
          800: "#9F1239",
          900: "#881337",
          950: "#4C0519",
        },
        surface: {
          bg: "#000000",
          card: "#18181B",
          elevated: "#1A1A2E",
          overlay: "rgba(10, 10, 20, 0.9)",
          ring: "#312E81",
          border: "#312E81",
        },
        score: {
          high: "#22C55E",
          medium: "#EAB308",
          low: "#EF4444",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        heading: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      screens: {
        xs: "360px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)",
        elevated:
          "0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)",
        modal:
          "0 10px 25px rgba(0,0,0,0.6), 0 4px 10px rgba(0,0,0,0.4)",
        glow:
          "0 0 15px rgba(225, 29, 72, 0.3), 0 0 30px rgba(225, 29, 72, 0.15)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
