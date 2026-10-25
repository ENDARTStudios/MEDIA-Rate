import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogFiltersClient } from "@/components/CatalogFiltersClient";
import { CatalogSearchBand } from "@/components/catalog/CatalogSearchBand";

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
    scoreDe: "{score}/100",
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
    activeCount: "{count} ativos",
    tipoLabel: "Tipo",
    allTypes: "Todos os tipos",
    showAll: "ver todos os {count}",
    showFewer: "ver menos",
    notaMinima: "Nota mínima",
    semMinimo: "sem mínimo",
    scoreMaxHint: "nota máxima",
    somenteCriticaCurto: "Só com crítica",
    pin: "Fixar aberto",
    unpin: "Desafixar",
    groupLabel: "Filtros do catálogo",
    anoMin: "De",
    anoMax: "Até",
    countLoading: "Contando títulos…",
    liveNotice: "o recorte é ao vivo",
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
  api: {
    get: vi.fn(async (url: string) =>
      String(url).includes("generos")
        ? [{ id: 1, nome: "Drama", slug: "drama", total_midias: 10 }]
        : [],
    ),
  },
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

describe("CatalogSearchBand — Ordenar sem duplicata (feedback Operador)", () => {
  it("ordenação é dropdown do produto e Relevância é o padrão", () => {
    renderWithProviders(<CatalogSearchBand />);

    // Gatilho: botão com aria-haspopup, não um <select> nativo.
    const gatilho = screen.getByTestId("catalog-sort");
    expect(gatilho).toHaveAttribute("aria-haspopup", "listbox");
    expect(gatilho).toHaveTextContent("Relevância");

    fireEvent.click(gatilho);
    const menu = screen.getByTestId("catalog-sort-menu");
    expect(menu).toHaveAttribute("role", "listbox");

    const opcoes = screen.getAllByRole("option");
    expect(opcoes).toHaveLength(4);
    expect(opcoes.map((o) => o.textContent?.trim())).toEqual([
      "Relevância",
      "Score",
      "Ano",
      "Título",
    ]);
    // "MEDIA Score" não entra como rótulo de option (a duplicata que o Operador viu).
    expect(opcoes[0]).toHaveAttribute("aria-selected", "true");
  });

  it("escolher no dropdown escreve ?sort= na URL e fecha o menu", () => {
    renderWithProviders(<CatalogSearchBand />);
    fireEvent.click(screen.getByTestId("catalog-sort"));
    fireEvent.click(screen.getByTestId("catalog-sort-opcao-score"));
    expect(routerMock.replace).toHaveBeenLastCalledWith(expect.stringContaining("sort=score"));
    expect(screen.queryByTestId("catalog-sort-menu")).toBeNull();
  });
});

describe("CatalogSearchBand (T237) — busca não perde digitação", () => {
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
    renderWithProviders(<CatalogSearchBand />);
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
    renderWithProviders(<CatalogSearchBand />);
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
    renderWithProviders(<CatalogSearchBand />);
    const input = screen.getByRole("searchbox");
    expect((input as HTMLInputElement).value).toBe("cavaleiro");

    // Usuário começa a digitar "cavaleiro dos sete" — o valor local manda.
    fireEvent.change(input, { target: { value: "cavaleiro dos sete" } });
    expect((input as HTMLInputElement).value).toBe("cavaleiro dos sete");
  });

  // ---------------- BETA-GAP-10/T127: contador e filtros honestos ----------------

  it("cabeçalho mostra quantos filtros estão ativos (não subconta)", () => {
    paramsHolder.urlParams = new URLSearchParams("genero=acao&com_critica=true");
    renderWithProviders(<CatalogFiltersClient />);
    // Cabeçalho do conceito: "FILTROS" + "N ativos" em accent.
    expect(screen.getByTestId("catalog-active-count")).toHaveTextContent("2 ativos");
    expect(screen.getByTestId("catalog-clear-all")).toBeEnabled();
  });

  it("busca ativa desabilita gênero/nota/crítica e mostra hint honesta", async () => {
    paramsHolder.urlParams = new URLSearchParams("q=matrix");
    renderWithProviders(<CatalogFiltersClient />);

    // Sem "Filtro avançado": a hint aparece direto, porque os grupos são visíveis.
    expect(screen.getByTestId("catalog-advanced-search-hint")).toBeInTheDocument();

    // Gênero: o grupo inteiro se declara indisponível e os radios ficam desabilitados.
    expect(screen.getByTestId("catalog-filter-genero")).toHaveAttribute("aria-disabled", "true");
    await screen.findByTestId("catalog-filter-genero-drama");
    const caixas = screen.getByTestId("catalog-filter-genero").querySelectorAll("input");
    expect(caixas.length).toBeGreaterThan(0);
    for (const caixa of Array.from(caixas)) expect(caixa).toBeDisabled();

    // Nota: slider (mínimo) e campo (máximo) desabilitados.
    expect(screen.getByTestId("catalog-filter-score-min")).toBeDisabled();
    expect(screen.getByTestId("catalog-filter-score-max")).toBeDisabled();

    // Crítica: switch desabilitado.
    expect(screen.getByTestId("catalog-filter-com-critica")).toBeDisabled();
  });

  it("sem busca, gênero/nota/crítica ficam habilitados", async () => {
    paramsHolder.urlParams = new URLSearchParams();
    renderWithProviders(<CatalogFiltersClient />);
    expect(screen.queryByTestId("catalog-advanced-search-hint")).toBeNull();
    expect(screen.getByTestId("catalog-filter-genero")).toHaveAttribute("aria-disabled", "false");
    await screen.findByTestId("catalog-filter-genero-drama");
    const caixas = screen.getByTestId("catalog-filter-genero").querySelectorAll("input");
    for (const caixa of Array.from(caixas)) expect(caixa).toBeEnabled();
    expect(screen.getByTestId("catalog-filter-score-min")).toBeEnabled();
    expect(screen.getByTestId("catalog-filter-com-critica")).toBeEnabled();
  });

  it("tipo é CHIP de seleção única: liga, troca e desliga", () => {
    paramsHolder.urlParams = new URLSearchParams();
    renderWithProviders(<CatalogFiltersClient />);
    expect(screen.getByTestId("catalog-filter-tipo")).toBeInTheDocument();

    // Clicar liga o tipo.
    fireEvent.click(screen.getByTestId("catalog-filter-tipo-movie"));
    expect(routerMock.replace).toHaveBeenLastCalledWith(expect.stringContaining("type=movie"));

    // Já selecionado: o mesmo chip desliga (volta ao catálogo completo).
    cleanup();
    routerMock.replace.mockClear();
    paramsHolder.urlParams = new URLSearchParams("type=movie");
    renderWithProviders(<CatalogFiltersClient />);
    const chip = screen.getByTestId("catalog-filter-tipo-movie");
    expect(chip).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(chip);
    expect(routerMock.replace).toHaveBeenLastCalledWith(expect.not.stringContaining("type=movie"));
  });

  it("gênero também acumula em CSV", async () => {
    paramsHolder.urlParams = new URLSearchParams();
    renderWithProviders(<CatalogFiltersClient />);
    // Gêneros chegam por consulta: espera o checkbox existir antes de clicar.
    fireEvent.click(await screen.findByTestId("catalog-filter-genero-drama"));
    expect(routerMock.replace).toHaveBeenLastCalledWith(expect.stringContaining("genero=drama"));
  });

  it("só com crítica é switch com estado anunciado", () => {
    paramsHolder.urlParams = new URLSearchParams("com_critica=true");
    renderWithProviders(<CatalogFiltersClient />);
    const botao = screen.getByTestId("catalog-filter-com-critica");
    expect(botao).toHaveAttribute("role", "switch");
    expect(botao).toHaveAttribute("aria-checked", "true");
  });
});
