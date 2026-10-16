import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

// Feedback do Operador: atalhos da Área de Administrador acessíveis em
// TODAS as páginas /admin/* (layout do App Router) + botão de retorno à
// página anterior.

const backMock = vi.fn();

vi.mock("@/lib/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} data-testid={`admin-nav-link-${href.replace("/admin/", "")}`} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: backMock, prefetch: vi.fn() }),
  usePathname: () => "/admin/diagnostics",
  redirect: vi.fn(),
}));

// T202: o layout virou gate server-side — nos testes de UX o gate passa (ADMIN).
vi.mock("@/lib/admin-auth-server", () => ({
  getServerAdminGate: vi.fn(async () => ({ autenticado: true, isAdmin: true })),
}));

import AdminLayout from "@/app/[locale]/admin/layout";

async function renderLayout() {
  return render(
    <NextIntlClientProvider
      locale="pt-BR"
      messages={{
        admin: {
          navLabel: "Área de administrador",
          navBack: "Voltar",
          navDiagnostics: "Diagnóstico",
          navUsers: "Gestão de usuários",
          navCatalog: "Catálogo",
          navMetrics: "Métricas",
          navAudit: "Auditoria",
          navLgpd: "LGPD",
          acessoNegado: "Acesso não autorizado.",
        },
      }}
    >
      {await AdminLayout({
        children: <div data-testid="conteudo-pagina">conteúdo</div>,
        params: Promise.resolve({ locale: "pt-BR" }),
      })}
    </NextIntlClientProvider>,
  );
}

describe("AdminLayout — navegação global da Área de Administrador", () => {
  beforeEach(() => {
    backMock.mockClear();
  });

  it("renderiza os 6 atalhos em todas as páginas do /admin", async () => {
    await renderLayout();
    for (const rota of ["diagnostics", "usuarios", "catalogo", "metricas", "auditoria", "lgpd"]) {
      expect(screen.getByTestId(`admin-nav-link-${rota}`)).toBeTruthy();
    }
    // o conteúdo da página renderiza dentro do layout
    expect(screen.getByTestId("conteudo-pagina")).toBeTruthy();
  });

  it("botão Voltar retorna à página anterior (router.back)", async () => {
    await renderLayout();
    fireEvent.click(screen.getByTestId("admin-voltar"));
    expect(backMock).toHaveBeenCalledTimes(1);
  });
});
