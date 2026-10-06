import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { api } from "@/lib/http";

// Onda 5 admin (P2) — log de auditoria com filtros (usuário/ação/período)
// e paginação. Hashes da cadeia NUNCA aparecem na tela.

const REGISTROS = {
  items: [
    {
      entidade: "Usuario",
      entidadeId: "90a1c50a-aa71-42d0-97e6-5304802b4d92",
      acao: "ADMIN_USUARIO_BANIDO",
      usuarioId: "90a1c50a-aa71-42d0-97e6-5304802b4d92",
      ip: "1.2.3.4",
      criado_em: "2026-10-05T12:00:00.000Z",
    },
  ],
  total: 26,
  page: 0,
  pageSize: 25,
};

vi.mock("@/lib/http", () => ({
  api: {
    get: vi.fn(async () => REGISTROS),
  },
}));

import AdminAuditoriaPage from "@/app/[locale]/admin/auditoria/page";

function renderPage() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <AdminAuditoriaPage />
    </NextIntlClientProvider>,
  );
}

describe("AdminAuditoriaPage (Onda 5 admin — P2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista registros com ação, entidade, usuário e IP — sem hashes", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("admin-auditoria-linha")).toHaveLength(1);
    });
    expect(screen.getByText("ADMIN_USUARIO_BANIDO")).toBeTruthy();
    expect(screen.getByText("1.2.3.4")).toBeTruthy();
    expect(screen.getByTestId("admin-auditoria-total").textContent).toContain("26");
    // hashes da cadeia nunca na tela
    expect(screen.queryByText("hash_cadeia")).toBeNull();
    expect(screen.queryByText("hash_anterior")).toBeNull();
  });

  it("filtros vão para a query da API (ação + período)", async () => {
    renderPage();
    fireEvent.change(screen.getByTestId("admin-auditoria-acao"), {
      target: { value: "ADMIN_USUARIO_BANIDO" },
    });
    fireEvent.change(screen.getByTestId("admin-auditoria-de"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByTestId("admin-auditoria-ate"), {
      target: { value: "2026-10-05" },
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        expect.stringContaining("acao=ADMIN_USUARIO_BANIDO"),
      );
    });
    const ultima = (api.get as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string;
    expect(ultima).toContain("de=2026-10-01");
    expect(ultima).toContain("ate=2026-10-05");
    expect(ultima).toContain("page=0");
  });

  it("paginação avança com a página na query", async () => {
    renderPage();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByText("Próxima"));
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(expect.stringContaining("page=1"));
    });
  });

  it("erro da API vira mensagem na página", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(
      new Error("Você não tem permissão para acessar este recurso."),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("admin-auditoria-erro").textContent).toContain("permissão");
    });
  });
});
