import { redirect } from "@/lib/navigation";
import { getServerAdminGate } from "@/lib/admin-auth-server";
import AdminShell from "@/components/admin/AdminShell";
import AdminAcessoNegado from "@/components/admin/AdminAcessoNegado";
import AdminStepUpDialog from "@/components/admin/AdminStepUpDialog";

/**
 * T202 — gate server-side da Área de Administrador
 * (docs/08-security/ADMIN_SECURITY.md: deny-by-default antes de renderizar).
 *
 * Sessão + papel ADMIN são validados AQUI (fonte de verdade: RolesGuard da API,
 * via getServerAdminGate) ANTES de qualquer UI administrativa existir no HTML:
 * - anônimo/sessão inválida → login (i18n-aware);
 * - autenticado não-ADMIN → mensagem genérica, SEM shell/nav/abas/tabelas/botões;
 * - ADMIN → shell + página normalmente.
 * O shell visual (AdminShell) permanece client component, mas só monta após o gate.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const gate = await getServerAdminGate();

  if (!gate.autenticado) {
    redirect({ href: "/login", locale });
  }

  if (!gate.isAdmin) {
    return <AdminAcessoNegado />;
  }

  return (
    <div>
      <AdminShell />
      {children}
      {/* T205 Fase 1 — diálogo de step-up (client): escuta o evento disparado
          pelo wrapper comStepUp quando a API responde 428. Só existe após o
          gate ADMIN acima. */}
      <AdminStepUpDialog />
    </div>
  );
}
