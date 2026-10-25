import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import fs from "node:fs";
import path from "node:path";
import { ListaViewPage } from "@/components/ListaViewPage";

/**
 * Regressão do crash de /listas/[slug] (2026-10-25, "Algo deu errado"):
 * o useMemo da ordenação vivia DEPOIS dos returns condicionais (loading/
 * notFound/error) — ao sair do loading, o número de hooks mudava entre
 * renders e o React derrubava a árvore. Este teste reproduz o caminho exato:
 * primeiro render EM loading, dados chegam depois.
 */

const LISTA = {
  id: "l1",
  titulo: "Horror Cósmico",
  descricao: "Essenciais do gênero",
  slug: "horror-cosmico",
  dono: { id: "u1", nome: "Edi" },
  eh_dono: true,
  itens: [
    {
      id: "i1",
      midia_id: "m1",
      observacao: null,
      titulo: "Color Out of Space",
      tipo: "FILME",
      ano_lancamento: 2019,
      imagem_url: null,
      score: 7.2,
    },
    {
      id: "i2",
      midia_id: "m2",
      observacao: null,
      titulo: "Berserk",
      tipo: "MANGA",
      ano_lancamento: 1989,
      imagem_url: null,
      score: 8.6,
    },
  ],
};

vi.mock("@/lib/http", () => ({
  api: {
    get: vi.fn(
      () =>
        new Promise((resolve) => {
          // resolve FORA do primeiro render — força o re-render com hooks novos
          setTimeout(() => resolve(LISTA), 10);
        }),
    ),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status?: number;
  },
}));

vi.mock("@/stores/use-auth-store", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    user: { id: "u1", name: "Edi", plan: "PREMIUM" },
    hydrated: true,
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mensagens = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/messages/pt-BR.json"), "utf8"),
) as Record<string, unknown>;

describe("ListaViewPage — regressão do crash de hook order", () => {
  it("loading → dados: página renderiza a lista sem 'Algo deu errado'", async () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={mensagens}>
        <ListaViewPage slug="horror-cosmico" />
      </NextIntlClientProvider>,
    );
    // dados chegam depois do primeiro render — nenhum erro de hooks pode derrubar
    const titulo = await waitFor(() => screen.findByText("Horror Cósmico"), { timeout: 3000 });
    expect(titulo).toBeTruthy();
    expect(screen.getByText("Color Out of Space")).toBeTruthy();
    expect(screen.getByText("Berserk")).toBeTruthy();
  });
});
