import { Space_Grotesk, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
};

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-heading", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang="pt-BR" is the default locale; suppressHydrationWarning handles SSR/client mismatch
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={cn(spaceGrotesk.variable, inter.variable, "min-h-screen bg-background text-foreground font-sans antialiased")}>
        {children}
      </body>
    </html>
  );
}
