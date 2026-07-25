import { cn } from "@/lib/utils";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background text-foreground font-sans antialiased")}>
        {children}
      </body>
    </html>
  );
}
