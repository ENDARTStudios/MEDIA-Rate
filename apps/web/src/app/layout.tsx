import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { SentryClientInit } from "@/components/SentryClientInit";
import { HtmlLang } from "@/components/HtmlLang";
import { OtelBrowserInit } from "@/components/OtelBrowserInit";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://mediarate.app"),
  icons: { icon: "/icon.svg" },
};

// Display/hero (Parte 2.4 do redesign): Cabinet Grotesk/Clash Display não
// estão disponíveis em next/font/google nem no Fontsource (E404) — mantido
// Space Grotesk 600-700 como fonte display (geometrica, mesma familia de
// estetica, ja aprovada). DECISAO registrada para validacao.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});
// Números de score (Parte 2.4): mono tabular com 700 para leitura de score.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
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
          "min-h-screen bg-background text-foreground font-sans antialiased",
        )}
      >
        <SentryClientInit />
        <HtmlLang />
        <OtelBrowserInit />
        {children}
      </body>
    </html>
  );
}
