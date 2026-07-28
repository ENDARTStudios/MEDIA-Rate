import { Space_Grotesk, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://media-rate-web.vercel.app"),
  icons: { icon: "/icon.svg" },
};

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-next-intl-locale") || "pt-BR";

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body
        className={cn(
          spaceGrotesk.variable,
          inter.variable,
          "min-h-screen bg-background text-foreground font-sans antialiased",
        )}
      >
        {children}
      </body>
    </html>
  );
}
