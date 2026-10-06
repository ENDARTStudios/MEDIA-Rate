import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { api } from "@/lib/http";

// Onda 3 admin (P1a) — CRUD do catálogo no painel: listagem com busca,
// criação (fonte manual + fonte_id único), edição (PATCH parcial) e
// remoção (soft delete com confirmação). Rotas T215 @Roles("ADMIN").

const ID_DUNA = "11111111-1111-4111-8111-111111111111";

const LISTA = {
  data: [
    {
      id: ID_DUNA,
      titulo: "Duna",
      tipo: "FILME",
      ano_lancamento: 2021,
      imagem_url: null,
    },
  ],
  next_cursor: null,
  total: 1,
};

const DETALHE = {
  id: ID_DUNA,
  titulo: "Duna",
  tipo: "FILME",
  ano_lancamento: 2021,
  sinopse: "No deserto de Arrakis…",
  titulo_original: "Dune",
  imagem_url: "https://img.example/duna.jpg",
};

vi.mock("@/lib/http", () => ({
  api: {
    get: vi.fn(async (url: string) =>
      String(url).includes(`/midias/${ID_DUNA}`) ? DETALHE : LISTA,
    ),
    post: vi.fn(async () => ({ id: "novo-1" })),
    patch: vi.fn(async () => ({ id: ID_DUNA })),
    delete: vi.fn(async () => ({ ok: true, message: "Mídia removida (soft delete)." })),
  },
}));

import AdminCatalogoPage from "@/app/[locale]/admin/catalogo/page";

function renderPage() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <AdminCatalogoPage />
    </NextIntlClientProvider>,
  );
}

describe("AdminCatalogoPage (Onda 3 admin — P1a: CRUD do catálogo)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(crypto, "randomUUID").mockReturnValue("uuid-gerado-1" as unknown as string);
  });

  it("lista títulos com busca no endpoint público", async () => {
    renderPage();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining("/api/v1/midias?limit=20"));
    });
    expect(await screen.findByText("Duna")).toBeTruthy();
    expect(screen.getByTestId(`admin-catalogo-editar-${ID_DUNA}`)).toBeTruthy();
    expect(screen.getByTestId(`admin-catalogo-remover-${ID_DUNA}`)).toBeTruthy();
  });

  it("criar: POST com fonte manual, fonte_id único e campos obrigatórios", async () => {
    renderPage();
    fireEvent.change(await screen.findByTestId("admin-catalogo-titulo"), {
      target: { value: "Teste Manga" },
    });
    fireEvent.change(screen.getByTestId("admin-catalogo-tipo"), {
      target: { value: "MANGA" },
    });
    fireEvent.change(screen.getByTestId("admin-catalogo-ano"), { target: { value: "2020" } });
    fireEvent.change(screen.getByTestId("admin-catalogo-sinopse"), {
      target: { value: "Sinopse de teste." },
    });
    fireEvent.click(screen.getByTestId("admin-catalogo-salvar"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/midias", {
        titulo: "Teste Manga",
        tipo: "MANGA",
        sinopse: "Sinopse de teste.",
        ano_lancamento: 2020,
        fonte: "manual",
        fonte_id: "manual-uuid-gerado-1",
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId("admin-catalogo-mensagem").textContent).toContain("Teste Manga");
    });
  });

  it("validação client: ano inválido → erro local sem chamada", async () => {
    renderPage();
    fireEvent.change(await screen.findByTestId("admin-catalogo-titulo"), {
      target: { value: "X" },
    });
    fireEvent.change(screen.getByTestId("admin-catalogo-ano"), { target: { value: "150" } });
    fireEvent.change(screen.getByTestId("admin-catalogo-sinopse"), { target: { value: "S" } });
    fireEvent.click(screen.getByTestId("admin-catalogo-salvar"));

    expect(screen.getByTestId("admin-catalogo-erro").textContent).toContain("1800");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("editar: carrega a mídia (GET detalhe) e salva via PATCH parcial", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId(`admin-catalogo-editar-${ID_DUNA}`));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/api/v1/midias/${ID_DUNA}`);
    });
    const titulo = await screen.findByTestId("admin-catalogo-titulo");
    expect((titulo as HTMLInputElement).value).toBe("Duna");

    fireEvent.change(titulo, { target: { value: "Duna (Editada)" } });
    fireEvent.click(screen.getByTestId("admin-catalogo-salvar"));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        `/api/v1/midias/${ID_DUNA}`,
        expect.objectContaining({ titulo: "Duna (Editada)", tipo: "FILME", ano_lancamento: 2021 }),
      );
    });
  });

  it("remover: confirma, chama DELETE e tira o item da lista", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId(`admin-catalogo-remover-${ID_DUNA}`));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/api/v1/midias/${ID_DUNA}`);
    });
    await waitFor(() => {
      expect(screen.queryByText("Duna")).toBeNull();
    });
  });
});
