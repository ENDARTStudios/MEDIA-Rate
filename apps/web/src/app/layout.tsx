import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { routing } from "@/i18n/routing";
import { SentryClientInit } from "@/components/SentryClientInit";
import { HtmlLang } from "@/components/HtmlLang";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // T211: necessário para que `env(safe-area-inset-*)` funcione (barra fixa da ficha).
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://mediarate.app"),
  icons: {
    icon: "/icon.svg",
    // Marca: apple-touch-icon opaco 180×180 (gerado em
    // design-system/media-rate/logo/exports/png/apple-icon-180.png).
    apple: "/apple-icon.png",
  },
};

// Display/hero (Parte 2.4 do redesign): Cabinet Grotesk/Clash Display não
// estão disponíveis em next/font/google nem no Fontsource (E404) — mantido
// Space Grotesk como fonte display (geometrica, mesma familia de estetica,
// ja aprovada). DECISAO registrada para validacao.
// A variavel e 300–700; o range declarado cobre o Light 300 do wordmark
// (RATE) e o Bold 700 das manchetes — antes ficava preso em 500–700 e o
// RATE caia no 500.
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  weight: "300 700",
  variable: "--font-heading",
  display: "swap",
});
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "400 600",
  variable: "--font-sans",
  display: "swap",
});
// Números de score (Parte 2.4): mono tabular com 700 para leitura de score.
const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  weight: "500 700",
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // T331: sem `await headers()` aqui (desligava ISR/estático globalmente).
  // <html lang> é corrigido por locale via <HtmlLang /> (cliente, no mount).
  return (
    <html lang={routing.defaultLocale} className="dark" suppressHydrationWarning>
      <body
        className={cn(
          spaceGrotesk.variable,
          inter.variable,
          jetbrainsMono.variable,
          "min-h-svh bg-background text-foreground font-sans antialiased",
        )}
      >
        <SentryClientInit />
        <HtmlLang />
        {children}
      </body>
    </html>
  );
}
