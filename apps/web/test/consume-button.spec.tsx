import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { WatchlistButton } from "@/components/WatchlistButton";
import { useWatchlistStore } from "@/stores/use-watchlist-store";

/**
 * T238 — "Quero consumir": o botão da ficha adiciona à watchlist via
 * POST /api/v1/watchlist com feedback; 401 (anônimo) → login com retorno;
 * 409 (duplicata) → estado "já está", não erro.
 */

const messages = {
  watchlist: {
    addToWatchlist: "Adicionar à watchlist",
    removeFromWatchlist: "Remover da watchlist",
    queroVer: "Quero ver",
    vendo: "Vendo",
    vi: "Vi",
    queroJogar: "Quero jogar",
    jogando: "Jogando",
    joguei: "Zerei",
    inWatchlist: "Na watchlist",
    limitReached: "Limite",
    upgradeCta: "Upgrade",
  },
  common: {},
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

// Mock do client HTTP: controla status por caminho.
const httpMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {} as {
    post: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  },
}));
httpMock.api.post = httpMock.post;
httpMock.api.get = httpMock.get;
httpMock.api.patch = httpMock.patch;
httpMock.api.delete = httpMock.delete;

vi.mock("@/lib/http", () => httpMock);

// Mock do router do next/navigation (usado por next-intl/navigation e pelo
// WatchlistButton no redirect de 401).
const routerMock = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/media/duna",
}));
// next-intl/navigation também usa useRouter/usePathname do next/navigation —
// o mock acima já cobre; o Link de next-intl não é exercitado nos testes.
vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
    redirect: () => undefined,
    usePathname: () => "/media/duna",
    useRouter: () => routerMock,
    getPathname: () => "/media/duna",
  }),
}));

describe("WatchlistButton (T238) — Quero consumir funcional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Zustand singleton: reseta o estado entre testes (entries vazias).
    useWatchlistStore.setState({ entries: [], isLoading: false, error: null, limitReached: false });
    httpMock.get.mockResolvedValue({ items: [] });
    httpMock.post.mockResolvedValue({ id: "e1", status: 201 });
    httpMock.patch.mockResolvedValue({});
    httpMock.delete.mockResolvedValue({});
  });

  it("201: clique adiciona à watchlist e o botão muda para estado 'na watchlist'", async () => {
    // GET /watchlist vazio inicialmente; após POST, retorna a entry.
    httpMock.get.mockImplementation(async () => {
      if (httpMock.post.mock.calls.length > 0) {
        return { items: [{ id: "e1", mediaId: "m1", status: "WANT" }] };
      }
      return { items: [] };
    });
    renderWithProviders(<WatchlistButton mediaId="m1" />);

    const btn = screen.getByRole("button", { name: /adicionar à watchlist/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(httpMock.post).toHaveBeenCalledWith("/api/v1/watchlist", {
        midia_id: "m1",
        coluna: "WANT",
      });
    });
    // Feedback: estado "na watchlist" (coração cheio → aria-label muda).
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /quero ver/i })).toBeTruthy();
    });
  });

  it("401: anônimo é redirecionado ao login com callbackUrl (nunca silencioso)", async () => {
    httpMock.post.mockRejectedValue(new httpMock.ApiError(401, "Não autenticado"));
    renderWithProviders(<WatchlistButton mediaId="m1" />);

    fireEvent.click(screen.getByRole("button", { name: /adicionar à watchlist/i }));

    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith(
        expect.stringContaining("/login?callbackUrl="),
      );
    });
    // O texto do callback contém o caminho da ficha.
    const arg = routerMock.replace.mock.calls[0][0] as string;
    expect(decodeURIComponent(arg)).toContain("/media/duna");
  });

  it("409: duplicata vira 'já está na watchlist', não erro silencioso nem crash", async () => {
    httpMock.post.mockRejectedValue(new httpMock.ApiError(409, "Já está na watchlist"));
    // Estado local vazio (como um clique duplicado em UI sem refresh);
    // o POST retorna 409 porque a entry já existe no servidor.
    renderWithProviders(<WatchlistButton mediaId="m1" />);

    fireEvent.click(screen.getByRole("button", { name: /adicionar à watchlist/i }));

    // Sem redirect para login e sem crash; estado permanece utilizável.
    await new Promise((r) => setTimeout(r, 50));
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("Já na watchlist: dropdown permite mover de coluna (PATCH /move)", async () => {
    // O WatchlistButton lê entries do store (não faz fetch no mount) —
    // popula o store diretamente como se a watchlist já tivesse a entry.
    useWatchlistStore.setState({
      entries: [{ id: "e1", mediaId: "m1", status: "WANT" }],
    });
    renderWithProviders(<WatchlistButton mediaId="m1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /quero ver/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: /quero ver/i }));
    const vendo = await screen.findByRole("button", { name: /vendo/i });
    fireEvent.click(vendo);

    await waitFor(() => {
      expect(httpMock.patch).toHaveBeenCalledWith("/api/v1/watchlist/e1/move", {
        coluna: "WATCHING",
      });
    });
  });
});
