import type { Metadata } from "next";
import { PlanThemeProvider } from "@/components/layout/PlanThemeProvider";

// T412 (D-390): rotas autenticadas NUNCA em cache ISR/CDN — evita HTML de um
// usuário servido a outro e dados stale (achado f do Operador).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Dashboard — MEDIA Rate",
    description: "Seu painel de controle. Watchlist, favoritos e estatísticas.",
    alternates: { canonical: `https://mediarate.app/${locale}/dashboard` },
    robots: { index: false, follow: false },
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PlanThemeProvider>{children}</PlanThemeProvider>;
}
