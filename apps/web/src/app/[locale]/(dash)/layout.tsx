import type { Metadata } from "next";
import { PlanThemeProvider } from "@/components/layout/PlanThemeProvider";
import { DashboardSidebar } from "../../../components/dashboard/DashboardSidebar";

/**
 * Shell da área do usuário (UAT-40 + fix 2026-10-25): a sidebar acompanha
 * TODAS as rotas do nav (Overview, Descobertas, Listas, Watchlist,
 * Biblioteca, Histórico, Perfil, Configurações) — antes ela só existia sob
 * /dashboard/** e sumia ao entrar em /listas & cia., deixando a página "sem
 * volta". Route group `(dash)` NÃO altera as URLs.
 *
 * T412 (D-390): rotas autenticadas NUNCA em cache ISR/CDN — evita HTML de um
 * usuário servido a outro e dados stale (achado f do Operador).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Dashboard — MEDIA Rate",
  description: "Seu painel de controle. Watchlist, favoritos e estatísticas.",
  robots: { index: false, follow: false },
};

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanThemeProvider>
      {/* Sidebar sticky (lg+) abaixo da Navbar global; conteúdo ao lado. */}
      <div className="mx-auto flex w-full max-w-[1440px] items-start gap-6 px-4 sm:px-6 lg:px-8">
        <DashboardSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </PlanThemeProvider>
  );
}
