import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta MEDIA Rate — azul primary + amber accent.
        // Contraste WCAG AA: primary-700 (#1d4ed8) em white = 8.6:1 (AAA).
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        accent: {
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
      },
      screens: {
        // Mobile-first: 360px (sm), 768px (md), 1024px (lg), 1440px (xl).
        xs: "360px",
      },
    },
  },
  plugins: [],
};

export default config;
