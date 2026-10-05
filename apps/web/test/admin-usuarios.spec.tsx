import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { api } from "@/lib/http";

// Onda 1 admin (P0) — painel de gestão de usuários: busca, filtro, alteração
// de plano (exceção MANUAL) e ban/desban com motivo.

const EDI_ID = "90a1c50a-aa71-42d0-97e6-5304802b4d92";

const USUARIOS = {
  items: [
    {
      id: EDI_ID,
      nome: "Edi",
      email: "edi@endart.com",
      plano: "PLUS",
      origem: "STRIPE",
      banido: false,
      criado_em: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000001",
      nome: null,
      email: "spammer@test.com",
      plano: "FREE",
      origem: "STRIPE",
      banido: true,
      criado_em: "2026-10-01T00:00:00.000Z",
    },
  ],
  total: 2,
  page: 0,
  pageSize: 25,
};

vi.mock("@/lib/http", () => ({
  api: {
    get: vi.fn(async () => USUARIOS),
    patch: vi.fn(async () => ({ usuarioId: EDI_ID, plano: "PREMIUM", origem: "MANUAL" })),
    post: vi.fn(async () => ({ usuarioId: EDI_ID })),
  },
}));

import AdminUsuariosPage from "@/app/[locale]/admin/usuarios/page";

function renderPage() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <AdminUsuariosPage />
    </NextIntlClientProvider>,
  );
}

describe("AdminUsuariosPage (Onda 1 admin — P0)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "prompt").mockReturnValue("violação dos termos");
  });

  it("lista usuários com plano, status e ações", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("admin-usuarios-linha")).toHaveLength(2);
    });
    expect(screen.getByText("edi@endart.com")).toBeTruthy();
    expect(screen.getByText("Banido")).toBeTruthy();
    expect(screen.getByTestId(`admin-usuarios-banir-${EDI_ID}`)).toBeTruthy();
    expect(
      screen.getByTestId("admin-usuarios-desbanir-00000000-0000-4000-8000-000000000001"),
    ).toBeTruthy();
    // chamada com paginação padrão
    expect(api.get).toHaveBeenCalledWith("/api/v1/admin/usuarios?page=0");
  });

  it("alterar plano chama PATCH com o plano escolhido e recarrega", async () => {
    renderPage();
    const select = await screen.findByTestId(`admin-usuarios-plano-${EDI_ID}`);
    fireEvent.change(select, { target: { value: "PREMIUM" } });
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(`/api/v1/admin/usuarios/${EDI_ID}/plano`, {
        plano: "PREMIUM",
      });
    });
    // recarrega a lista após a mudança
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it("banir pede motivo, chama POST e recarrega", async () => {
    renderPage();
    const botao = await screen.findByTestId(`admin-usuarios-banir-${EDI_ID}`);
    fireEvent.click(botao);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(`/api/v1/admin/usuarios/${EDI_ID}/ban`, {
        motivo: "violação dos termos",
      });
    });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it("desbanir chama POST sem corpo", async () => {
    renderPage();
    const botao = await screen.findByTestId(
      "admin-usuarios-desbanir-00000000-0000-4000-8000-000000000001",
    );
    fireEvent.click(botao);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/v1/admin/usuarios/00000000-0000-4000-8000-000000000001/desbanir",
      );
    });
  });

  it("403 da API vira mensagem de erro na página", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(
      new Error("Você não tem permissão para acessar este recurso."),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("admin-usuarios-erro").textContent).toContain("permissão");
    });
  });
});
