import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SearchCommand } from "@/components/SearchCommand";

/**
 * T233 — a searchbox deve renderizar EXCLUSIVAMENTE a resposta de
 * /api/v1/discover (normalizado, T223/T227), sem filtro client-side por
 * substring. Regressão clássica: 'acao' (sem acento) retornava zero na UI
 * apesar da API responder 5 itens; 'ação' mostrava 'Coração Partido'
 * (substring local) que nem está no conjunto da API.
 */

const messages = {
  catalog: {
    search: "Buscar mídia",
    filme: "Filme",
    serie: "Série",
    game: "Game",
    livro: "Livro",
    comic: "HQ",
    manga: "Mangá",
    paletaMinChars: "Digite pelo menos 2 letras para buscar...",
    paletaSearching: "Buscando...",
    paletaEmpty: "Nenhum resultado encontrado.",
    paletaEmptyHint: "Tente outro título ou explore o catálogo.",
    paletaError: "Não foi possível buscar agora.",
    paletaErrorHint: "Verifique sua conexão e tente novamente.",
    noResults: "Nenhum resultado encontrado",
    comingSoonTap: "Em breve",
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

/** Mock do /api/v1/discover — resposta idêntica à da API real. */
function mockDiscover(itens: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ itens, total_estimado: itens.length }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

const ITENS_ACAO = [
  {
    id: "1",
    titulo: "Em Movimento",
    tipo: "SERIE",
    ano: 2023,
    poster_url: null,
    score: 8.47,
    na_watchlist: false,
    slug: "em-movimento",
  },
  {
    id: "2",
    titulo: "Coringa",
    tipo: "FILME",
    ano: 2019,
    poster_url: null,
    score: 7.9,
    na_watchlist: false,
    slug: "coringa",
  },
  {
    id: "3",
    titulo: "Taxi Driver: Motorista de Táxi",
    tipo: "FILME",
    ano: 1976,
    poster_url: null,
    score: 8.2,
    na_watchlist: false,
    slug: "taxi-driver",
  },
];

async function abrirBuscaETipar(texto: string) {
  renderWithProviders(<SearchCommand />);
  fireEvent.click(screen.getByRole("button", { name: /buscar/i }));
  const input = await screen.findByPlaceholderText(/buscar filmes/i);
  fireEvent.change(input, { target: { value: texto } });
  return input;
}

describe("SearchCommand (T233) — renderiza a resposta do /discover sem filtro local", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("q sem acento ('acao') renderiza exatamente os títulos da API (5 → mock igual da produção)", async () => {
    mockDiscover(ITENS_ACAO);
    await abrirBuscaETipar("acao");

    await waitFor(() => {
      expect(screen.getByText("Em Movimento")).toBeTruthy();
      expect(screen.getByText("Coringa")).toBeTruthy();
      expect(screen.getByText("Taxi Driver: Motorista de Táxi")).toBeTruthy();
    });
    // Nenhum título fora da resposta da API aparece.
    expect(screen.queryByText("Coração Partido")).toBeNull();
    expect(screen.queryByText(/nenhum resultado/i)).toBeNull();
  });

  it("q com acento ('ação') retorna o MESMO conjunto (paridade binária)", async () => {
    mockDiscover(ITENS_ACAO);
    await abrirBuscaETipar("ação");

    await waitFor(() => {
      expect(screen.getByText("Coringa")).toBeTruthy();
    });
    expect(screen.queryByText("Coração Partido")).toBeNull();
  });

  it("API retorna lista vazia → 'Nenhum resultado' (nunca mock por substring)", async () => {
    mockDiscover([]);
    await abrirBuscaETipar("zzzz");

    await waitFor(() => {
      expect(screen.getByText(/nenhum resultado/i)).toBeTruthy();
    });
  });

  it("API fora do ar (500) → estado de ERRO visível (retry), nunca 'Nenhum resultado'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("erro", { status: 500 })),
    );
    await abrirBuscaETipar("acao");

    // T263: 500 → erro visível (não 'Nenhum resultado' silencioso).
    await waitFor(() => {
      expect(screen.getByText(/não foi possível buscar/i)).toBeTruthy();
    });
    expect(screen.queryByText(/nenhum resultado/i)).toBeNull();
    // Sem resultados falsos de MOCK_MEDIA (ex.: títulos que contêm "acao").
    expect(screen.queryByText(/Jujutsu/i)).toBeNull();
  });
});
