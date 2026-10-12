import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

/**
 * T202 — gate server-side do layout admin (ADMIN_SECURITY: deny-by-default).
 * A fonte da verdade é o RolesGuard da API, consultado pelo helper
 * getServerAdminGate (probe @Roles("ADMIN")). Anônimo → login; não-admin →
 * mensagem genérica SEM nenhuma superfície administrativa; ADMIN → shell + página.
 */

const { gateMock, redirectMock } = vi.hoisted(() => ({
  gateMock: vi.fn(),
  redirectMock: vi.fn((args: { href: string; locale: string }) => {
    throw new Error(`REDIRECT:${args.locale}:${args.href}`);
  }),
}));

vi.mock("@/lib/admin-auth-server", () => ({
  getServerAdminGate: gateMock,
}));

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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  redirect: redirectMock,
}));

import AdminLayout from "@/app/[locale]/admin/layout";

async function renderLayout(props?: { gate: unknown }) {
  gateMock.mockResolvedValue(props?.gate ?? { autenticado: true, isAdmin: true });
  // Layout é async server component: resolve o element antes do render.
  const ui = await AdminLayout({
    children: <div data-testid="conteudo-pagina">conteúdo</div>,
    params: Promise.resolve({ locale: "pt-BR" }),
  });
  return render(
    <NextIntlClientProvider
      locale="pt-BR"
      messages={{ admin: { acessoNegado: "Acesso não autorizado." } }}
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AdminLayout — gate server-side (T202, deny-by-default)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ADMIN: renderiza shell + conteúdo da página", async () => {
    await renderLayout({ gate: { autenticado: true, isAdmin: true } });
    expect(screen.getByTestId("admin-nav")).toBeTruthy();
    expect(screen.getByTestId("conteudo-pagina")).toBeTruthy();
    expect(screen.queryByTestId("admin-acesso-negado")).toBeNull();
  });

  it("autenticado não-admin: SEM nav, SEM shell, SEM conteúdo — só mensagem genérica", async () => {
    await renderLayout({ gate: { autenticado: true, isAdmin: false } });
    expect(screen.getByTestId("admin-acesso-negado")).toBeTruthy();
    expect(screen.getByText("Acesso não autorizado.")).toBeTruthy();
    expect(screen.queryByTestId("admin-nav")).toBeNull();
    expect(screen.queryByTestId("conteudo-pagina")).toBeNull();
  });

  it("anônimo: redirect para login e nenhuma superfície admin", async () => {
    let capturado: unknown = null;
    gateMock.mockResolvedValue({ autenticado: false, isAdmin: false });
    try {
      await renderLayout({ gate: { autenticado: false, isAdmin: false } });
    } catch (e) {
      capturado = e;
    }
    expect(redirectMock).toHaveBeenCalledWith({ href: "/login", locale: "pt-BR" });
    expect(String(capturado)).toContain("REDIRECT:pt-BR:/login");
    expect(screen.queryByTestId("admin-nav")).toBeNull();
    expect(screen.queryByTestId("conteudo-pagina")).toBeNull();
  });
});
