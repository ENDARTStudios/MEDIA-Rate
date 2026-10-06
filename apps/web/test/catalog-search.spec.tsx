import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogFiltersClient } from "@/components/CatalogFiltersClient";

/**
 * T237 — o filtro de busca do catálogo NÃO pode perder caracteres na
 * digitação rápida. Causa raiz: o input era controlado por sp.get("q")
 * (URL) e cada tecla fazia router.replace — o replace é assíncrono e o
 * re-render com a URL antiga "voltava" o input. Correção: estado local +
 * debounce + guarda de hidratação (nunca sobrescreve digitação em andamento).
 */

const messages = {
  catalog: {
    search: "Buscar",
    sort: "Ordenar",
    sortScore: "Score",
    sortRelevancia: "Relevância",
    sortAno: "Ano",
    sortTitulo: "Título",
  },
  catalogFilters: {
    filters: "Filtros",
    clearAll: "Limpar tudo",
    advancedFilters: "Filtros avançados",
    genero: "Gênero",
    todosGeneros: "Todos os gêneros",
    scoreMin: "Mín.",
    scoreMax: "Máx.",
    somenteCritica: "Somente crítica",
    anoLabel: "Ano",
    advancedUnavailableSearch: "Indisponível com busca",
  },
  common: {},
};

// URLSearchParams mutável controlado pelo teste — via holder para que o
// vi.mock leia SEMPRE o valor atual (closure viva).
const paramsHolder = vi.hoisted(() => ({ urlParams: new URLSearchParams() }));
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => paramsHolder.urlParams,
  useRouter: () => routerMock,
  usePathname: () => "/pt-BR/catalog",
}));

vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
    redirect: () => undefined,
    usePathname: () => "/pt-BR/catalog",
    useRouter: () => routerMock,
    getPathname: () => "/pt-BR/catalog",
  }),
}));

// API de gêneros mockada (o componente consulta /api/v1/midias/generos).
vi.mock("@/lib/http", () => ({
  api: { get: vi.fn(async () => []) },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="pt-BR" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("CatalogFiltersClient — Ordenar sem duplicata (feedback Operador)", () => {
  it("option padrão é Relevância; MEDIA Score aparece UMA única vez", () => {
    const { container } = renderWithProviders(<CatalogFiltersClient />);
    const sortSelect = container.querySelector("#catalog-sort") as HTMLSelectElement;
    expect(sortSelect).toBeTruthy();
    const valores = [...(sortSelect as HTMLSelectElement).options].map((o) => o.value);
    // valores distintos: score aparece UMA vez (antes: option vazia + score
    // ambas rotuladas "MEDIA Score" — duplicata visível)
    expect(valores.filter((v) => v === "score").length).toBe(1);
    expect(valores).toEqual(["", "score", "year", "title"]);
    // o option padrão renderiza o label Relevância (não MEDIA Score)
    const opcoesTexto = [...(sortSelect as HTMLSelectElement).options].map((o) => o.textContent);
    expect(opcoesTexto[0]).toBe("Relevância");
    expect(opcoesTexto).not.toContain("MEDIA Score");
  });
});

describe("CatalogFiltersClient (T237) — busca não perde digitação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsHolder.urlParams = new URLSearchParams();
    // Simula o router.replace: atualiza a URLSearchParams (comportamento do
    // Next.js) para que o componente hidrate corretamente.
    routerMock.replace.mockImplementation((url: string) => {
      const qs = url.includes("?") ? url.split("?")[1] : "";
      paramsHolder.urlParams = new URLSearchParams(qs);
    });
  });

  it("digitação rápida (0ms entre teclas) preserva o texto caractere a caractere", async () => {
    renderWithProviders(<CatalogFiltersClient />);
    const input = screen.getByRole("searchbox");

    // Digita "liberdade" em uma rajada — o value do input é estado local,
    // então NENHUMA tecla pode ser perdida.
    fireEvent.change(input, { target: { value: "l" } });
    fireEvent.change(input, { target: { value: "li" } });
    fireEvent.change(input, { target: { value: "lib" } });
    fireEvent.change(input, { target: { value: "libe" } });
    fireEvent.change(input, { target: { value: "liber" } });
    fireEvent.change(input, { target: { value: "libera" } });
    fireEvent.change(input, { target: { value: "liberad" } });
    fireEvent.change(input, { target: { value: "liberdad" } });
    fireEvent.change(input, { target: { value: "liberdade" } });

    // Valor final íntegro imediatamente (estado local, sem esperar URL).
    expect((input as HTMLInputElement).value).toBe("liberdade");

    // Após o debounce, a URL recebe o termo completo (uma única vez).
    await waitFor(
      () => {
        expect(routerMock.replace).toHaveBeenCalledWith(expect.stringContaining("q=liberdade"));
      },
      { timeout: 1000 },
    );
  });

  it("digitação contínua não gera chamada por tecla (só após pausa)", async () => {
    renderWithProviders(<CatalogFiltersClient />);
    const input = screen.getByRole("searchbox");

    // Rajada completa dentro do debounce: zero commits intermediários.
    fireEvent.change(input, { target: { value: "sonho" } });
    fireEvent.change(input, { target: { value: "sonho de" } });
    fireEvent.change(input, { target: { value: "sonho de lib" } });

    expect(routerMock.replace).not.toHaveBeenCalled();

    // Após a pausa (debounce), um único commit com o valor final.
    await waitFor(
      () => {
        expect(routerMock.replace).toHaveBeenCalledTimes(1);
      },
      { timeout: 1000 },
    );
    // URLSearchParams.toString() codifica espaço como '+'.
    expect(routerMock.replace.mock.calls[0][0]).toContain("q=sonho+de+lib");
  });

  it("hidratação da URL não sobrescreve digitação em andamento", async () => {
    // URL já tem "cavaleiro" (navegação externa) → input hidrata no mount.
    paramsHolder.urlParams = new URLSearchParams("q=cavaleiro");
    renderWithProviders(<CatalogFiltersClient />);
    const input = screen.getByRole("searchbox");
    expect((input as HTMLInputElement).value).toBe("cavaleiro");

    // Usuário começa a digitar "cavaleiro dos sete" — o valor local manda.
    fireEvent.change(input, { target: { value: "cavaleiro dos sete" } });
    expect((input as HTMLInputElement).value).toBe("cavaleiro dos sete");
  });

  // ---------------- BETA-GAP-10/T127: contador e filtros honestos ----------------

  it("contador de filtros inclui gênero e 'somente crítica' (não subconta)", () => {
    paramsHolder.urlParams = new URLSearchParams("genero=acao&com_critica=true");
    renderWithProviders(<CatalogFiltersClient />);
    expect(screen.getByText("Filtros (2)")).toBeTruthy();
    expect(screen.getByTestId("catalog-clear-all")).toBeTruthy();
  });

  it("busca ativa desabilita gênero/nota/crítica e mostra hint honesta", () => {
    paramsHolder.urlParams = new URLSearchParams("q=matrix");
    renderWithProviders(<CatalogFiltersClient />);
    fireEvent.click(screen.getByRole("button", { name: "Filtros avançados" }));
    expect(screen.getByTestId("catalog-advanced-search-hint")).toBeTruthy();
    expect((screen.getByTestId("catalog-filter-genero") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByTestId("catalog-filter-score-min") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect((screen.getByTestId("catalog-filter-score-max") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect((screen.getByTestId("catalog-filter-com-critica") as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it("sem busca, gênero/nota/crítica ficam habilitados", () => {
    paramsHolder.urlParams = new URLSearchParams();
    renderWithProviders(<CatalogFiltersClient />);
    fireEvent.click(screen.getByRole("button", { name: "Filtros avançados" }));
    expect(screen.queryByTestId("catalog-advanced-search-hint")).toBeNull();
    expect((screen.getByTestId("catalog-filter-genero") as HTMLSelectElement).disabled).toBe(false);
    expect((screen.getByTestId("catalog-filter-com-critica") as HTMLInputElement).disabled).toBe(
      false,
    );
  });
});
