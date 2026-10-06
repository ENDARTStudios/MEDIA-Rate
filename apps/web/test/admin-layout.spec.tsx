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
}));

import AdminLayout from "@/app/[locale]/admin/layout";

function renderLayout() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <AdminLayout>
        <div data-testid="conteudo-pagina">conteúdo</div>
      </AdminLayout>
    </NextIntlClientProvider>,
  );
}

describe("AdminLayout — navegação global da Área de Administrador", () => {
  beforeEach(() => {
    backMock.mockClear();
  });

  it("renderiza os 6 atalhos em todas as páginas do /admin", () => {
    renderLayout();
    for (const rota of ["diagnostics", "usuarios", "catalogo", "metricas", "auditoria", "lgpd"]) {
      expect(screen.getByTestId(`admin-nav-link-${rota}`)).toBeTruthy();
    }
    // o conteúdo da página renderiza dentro do layout
    expect(screen.getByTestId("conteudo-pagina")).toBeTruthy();
  });

  it("botão Voltar retorna à página anterior (router.back)", () => {
    renderLayout();
    fireEvent.click(screen.getByTestId("admin-voltar"));
    expect(backMock).toHaveBeenCalledTimes(1);
  });
});
