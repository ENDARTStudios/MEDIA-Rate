import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { api } from "@/lib/http";

// Onda 1 admin (P0) — painel de gestão de usuários: busca, filtro, alteração
// de plano (exceção MANUAL) e ban/desban com motivo.
// Onda 2 admin (P0b) — histórico de atividade + moderação (remover interação
// e watchlist de qualquer usuário, com motivo auditado).

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

const ATIVIDADE = {
  usuario: { id: EDI_ID, email: "edi@endart.com" },
  interacoes: [
    {
      id: "int-1",
      status: "CONCLUIDO",
      reacao: "GOSTEI",
      atualizado_em: "2026-10-01T00:00:00.000Z",
      midia: { id: "m-1", titulo: "Duna", tipo: "FILME" },
    },
  ],
  watchlist: [{ id: "wl-1", midia_id: "m-2", coluna: "WANT" }],
};

vi.mock("@/lib/http", () => ({
  api: {
    get: vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/atividade")) return ATIVIDADE;
      if (u.includes("/patrocinios")) return [];
      return USUARIOS;
    }),
    patch: vi.fn(async () => ({ usuarioId: EDI_ID, plano: "PREMIUM", origem: "MANUAL" })),
    post: vi.fn(async () => ({ usuarioId: EDI_ID })),
    delete: vi.fn(async () => ({ ok: true })),
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
    // recarrega a lista após a mudança (o mount também busca os patrocínios —
    // a contagem aqui é só das chamadas de usuários)
    await waitFor(() => {
      const chamadasUsuarios = (api.get as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([u]) => String(u).includes('/admin/usuarios'),
      );
      expect(chamadasUsuarios.length).toBe(2);
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
      const chamadasUsuarios = (api.get as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([u]) => String(u).includes('/admin/usuarios'),
      );
      expect(chamadasUsuarios.length).toBe(2);
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
    // UAT-46: o mount também busca patrocínios (com catch próprio) — o 403
    // precisa rejeitar a chamada de USUÁRIOS, não a primeira que chegar.
    const original = vi.mocked(api.get).getMockImplementation();
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (String(url).includes("/admin/usuarios")) {
        throw new Error("Você não tem permissão para acessar este recurso.");
      }
      return [];
    });
    try {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId("admin-usuarios-erro").textContent).toContain("permissão");
      });
    } finally {
      // a implementação é do mock do MÓDULO — sem restaurar, vaza p/ os próximos
      vi.mocked(api.get).mockImplementation(original ?? (async () => ({})));
    }
  });
});

describe("AdminUsuariosPage (Onda 2 admin — P0b: atividade e moderação)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "prompt").mockReturnValue("violação dos termos");
  });

  it("Atividade abre o painel com interações e watchlist do usuário", async () => {
    renderPage();
    const botao = await screen.findByTestId(`admin-usuarios-atividade-${EDI_ID}`);
    fireEvent.click(botao);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/api/v1/admin/usuarios/${EDI_ID}/atividade`);
    });
    expect(screen.getByTestId("admin-atividade-painel")).toBeTruthy();
    expect(screen.getByText("Duna")).toBeTruthy();
    expect(screen.getByTestId("admin-atividade-remover-m-1")).toBeTruthy();
    expect(screen.getByTestId("admin-watchlist-remover-wl-1")).toBeTruthy();
  });

  it("remover interação pede motivo, chama DELETE e refresca a atividade", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId(`admin-usuarios-atividade-${EDI_ID}`));
    const remover = await screen.findByTestId("admin-atividade-remover-m-1");
    fireEvent.click(remover);
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/api/v1/admin/usuarios/${EDI_ID}/interacoes/m-1`, {
        body: { motivo: "violação dos termos" },
      });
    });
    // refetch da atividade após a remoção
    await waitFor(() => {
      const chamadasAtividade = (api.get as ReturnType<typeof vi.fn>).mock.calls.filter(([u]) =>
        String(u).includes("/atividade"),
      );
      expect(chamadasAtividade.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("UAT-46: registra patrocínio do usuário no registro público", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId(`admin-usuarios-patrocinar-${EDI_ID}`));
    expect(screen.getByTestId("admin-patrocinio-form")).toBeTruthy();
    fireEvent.change(screen.getByTestId("admin-patrocinio-secao"), {
      target: { value: "Cinema" },
    });
    fireEvent.change(screen.getByTestId("admin-patrocinio-rotulo"), {
      target: { value: "Conteúdo patrocinado — banner Cinema" },
    });
    fireEvent.click(screen.getByTestId("admin-patrocinio-salvar"));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/admin/patrocinios", {
        usuario_id: EDI_ID,
        patrocinador: "Edi",
        secao: "Cinema",
        rotulo: "Conteúdo patrocinado — banner Cinema",
        desde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
    });
    // o formulário fecha após registrar
    expect(screen.queryByTestId("admin-patrocinio-form")).toBeNull();
  });
});
