import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type * as NextIntl from "next-intl";
import type * as ApiInteracoes from "@/lib/api-interacoes";

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof NextIntl>();
  return {
    ...actual,
    useTranslations: () => {
      const t = (key: string, params?: Record<string, unknown>) =>
        params ? `${key}:${JSON.stringify(params)}` : key;
      return t;
    },
    useLocale: () => "pt-BR",
  };
});

let getInteracoesMock = vi.fn();

vi.mock("@/lib/api-interacoes", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiInteracoes>();
  return { ...actual, getInteracoes: (...args: unknown[]) => getInteracoesMock(...args) };
});

vi.mock("@/lib/navigation", () => ({
  usePathname: () => "/biblioteca",
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
    <a {...props}>{children}</a>
  ),
}));

import { BibliotecaClient } from "@/components/biblioteca/BibliotecaClient";
import type { InteracoesPagina, Interacao } from "@/lib/api-interacoes";
import { consumoParaColuna } from "@/lib/watchlist-labels";

const ISO = new Date("2026-09-21T12:00:00Z").toISOString();

const INTERACAO = (
  id: string,
  status: Interacao["status"],
  titulo: string,
  tipo: string,
): Interacao => ({
  id,
  midiaId: `m-${id}`,
  status,
  atualizadoEm: ISO,
  midia: {
    id: `m-${id}`,
    slug: titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    titulo,
    tipo,
    anoLancamento: 2024,
    imagemUrl: null,
    score: 80,
  },
});

const POR_STATUS_CHEIO = {
  QUERO_CONSUMIR: 1,
  CONSUMINDO: 1,
  CONCLUIDO: 1,
  ABANDONADO: 1,
};

const CONJUNTO = [
  INTERACAO("i1", "CONCLUIDO", "Duna: Parte Dois", "FILME"),
  INTERACAO("i2", "CONSUMINDO", "Hades II", "GAME"),
  INTERACAO("i3", "QUERO_CONSUMIR", "Piranesi", "LIVRO"),
  INTERACAO("i4", "ABANDONADO", "O Menu", "FILME"),
];

function PAGINA(
  items: Interacao[],
  porStatus: Record<string, number> = POR_STATUS_CHEIO,
  nextCursor: string | null = null,
  total = items.length,
): InteracoesPagina {
  return {
    items,
    total,
    porStatus: {
      QUERO_CONSUMIR: 0,
      CONSUMINDO: 0,
      CONCLUIDO: 0,
      ABANDONADO: 0,
      ...porStatus,
    },
    nextCursor,
  };
}

const paginaConjunto = (nextCursor: string | null = null) =>
  PAGINA(CONJUNTO, POR_STATUS_CHEIO, nextCursor, 4);

async function renderBiblioteca(
  initialStatus: Interacao["status"] | null = null,
  initialTipo: ApiInteracoes.TipoMidiaApi | null = null,
) {
  getInteracoesMock = vi.fn().mockResolvedValue(paginaConjunto());
  const view = render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <BibliotecaClient initialStatus={initialStatus} initialTipo={initialTipo} />
    </NextIntlClientProvider>,
  );
  await screen.findByTestId("biblioteca-client");
  await waitFor(() => expect(screen.getAllByTestId("biblioteca-item").length).toBe(4));
  return view;
}

describe("consumoParaColuna (inverso do vocabulário T239)", () => {
  it("mapeia os 4 status de consumo para colunas da watchlist", () => {
    expect(consumoParaColuna("QUERO_CONSUMIR")).toBe("WANT");
    expect(consumoParaColuna("CONSUMINDO")).toBe("WATCHING");
    expect(consumoParaColuna("CONCLUIDO")).toBe("COMPLETED");
    expect(consumoParaColuna("ABANDONADO")).toBe("DROPPED");
  });
});

describe("BibliotecaClient (D-525 — envelope paginado)", () => {
  it("mostra as 4 abas de status com contagens GLOBAIS do servidor", async () => {
    await renderBiblioteca();
    expect(screen.getByText("tabAll · 4")).toBeTruthy();
    expect(screen.getByText("queroConsumir · 1")).toBeTruthy();
    expect(screen.getByText("consumindo · 1")).toBeTruthy();
    expect(screen.getByText("concluido · 1")).toBeTruthy();
    expect(screen.getByText("abandonado · 1")).toBeTruthy();
  });

  it("busca página 1 com limit 50 e sem filtros por padrão", async () => {
    await renderBiblioteca();
    expect(getInteracoesMock).toHaveBeenCalledWith({
      limit: 50,
      status: undefined,
      tipo: undefined,
    });
  });

  it("initialStatus (atalho Quero ver) abre na aba QUERO_CONSUMIR", async () => {
    getInteracoesMock = vi
      .fn()
      .mockResolvedValue(PAGINA([CONJUNTO[2] ?? CONJUNTO[2]], { QUERO_CONSUMIR: 1 }, null, 1));
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <BibliotecaClient initialStatus="QUERO_CONSUMIR" initialTipo={null} />
      </NextIntlClientProvider>,
    );
    await screen.findByTestId("biblioteca-client");
    const selecionada = screen.getByRole("tab", { selected: true });
    expect(selecionada.textContent).toContain("queroConsumir");
    expect(screen.getAllByTestId("biblioteca-item")).toHaveLength(1);
    expect(screen.getByText("Piranesi")).toBeTruthy();
  });

  it("trocar aba refaz a busca server-side com o status", async () => {
    await renderBiblioteca();
    getInteracoesMock = vi
      .fn()
      .mockResolvedValue(PAGINA([CONJUNTO[0] ?? CONJUNTO[0]], { CONCLUIDO: 1 }, null, 1));
    fireEvent.click(screen.getByText("concluido · 1"));
    await waitFor(() =>
      expect(getInteracoesMock).toHaveBeenLastCalledWith({
        status: "CONCLUIDO",
        tipo: undefined,
        limit: 50,
      }),
    );
    await waitFor(() => expect(screen.getAllByTestId("biblioteca-item")).toHaveLength(1));
    expect(screen.getByText("Duna: Parte Dois")).toBeTruthy();
  });

  it("carregar mais anexa a próxima página via cursor", async () => {
    getInteracoesMock = vi
      .fn()
      .mockResolvedValueOnce(PAGINA([CONJUNTO[0] ?? CONJUNTO[0]], POR_STATUS_CHEIO, "Mg", 4))
      .mockResolvedValueOnce(PAGINA([CONJUNTO[1] ?? CONJUNTO[1]], POR_STATUS_CHEIO, null, 4));
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <BibliotecaClient initialStatus={null} initialTipo={null} />
      </NextIntlClientProvider>,
    );
    await screen.findByTestId("biblioteca-client");
    await waitFor(() => expect(screen.getByTestId("biblioteca-carregar-mais")).toBeTruthy());
    expect(screen.getByText('mostrandoDe:{"n":1,"total":4}')).toBeTruthy();
    fireEvent.click(screen.getByTestId("biblioteca-carregar-mais"));
    await waitFor(() => expect(screen.getAllByTestId("biblioteca-item")).toHaveLength(2));
    expect(getInteracoesMock).toHaveBeenLastCalledWith({
      limit: 50,
      cursor: "Mg",
      status: undefined,
      tipo: undefined,
    });
    expect(screen.getByText("Hades II")).toBeTruthy();
  });

  it("filtro por tipo vai server-side e combina com status", async () => {
    await renderBiblioteca();
    getInteracoesMock = vi.fn().mockResolvedValue(PAGINA([], POR_STATUS_CHEIO, null, 0));
    fireEvent.click(screen.getByText("abandonado · 1"));
    // refetch mostra loading e volta com 0 itens (combinação vazia)
    await waitFor(() => expect(screen.getByText("filterEmptyTitle")).toBeTruthy());
    fireEvent.click(screen.getByText("game"));
    await waitFor(() =>
      expect(getInteracoesMock).toHaveBeenLastCalledWith({
        status: "ABANDONADO",
        tipo: "GAME",
        limit: 50,
      }),
    );
    await waitFor(() => expect(screen.getByText("filterEmptyTitle")).toBeTruthy());
  });

  it("rótulo do card conjuga o verbo por tipo de mídia (vi/jogando/queroLer/abandonei)", async () => {
    await renderBiblioteca();
    expect(screen.getByText("vi")).toBeTruthy(); // FILME + CONCLUIDO
    expect(screen.getByText("jogando")).toBeTruthy(); // GAME + CONSUMINDO
    expect(screen.getByText("queroLer")).toBeTruthy(); // LIVRO + QUERO_CONSUMIR
    expect(screen.getByText("abandonei")).toBeTruthy(); // DROPPED comum
  });

  it("biblioteca vazia → estado vazio com CTA para o catálogo", async () => {
    getInteracoesMock = vi
      .fn()
      .mockResolvedValue(
        PAGINA([], { QUERO_CONSUMIR: 0, CONSUMINDO: 0, CONCLUIDO: 0, ABANDONADO: 0 }),
      );
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <BibliotecaClient initialStatus={null} initialTipo={null} />
      </NextIntlClientProvider>,
    );
    expect(await screen.findByText("emptyTitle")).toBeTruthy();
    expect(screen.getByText("emptyCta")).toBeTruthy();
  });

  it("erro da API → estado de erro com retry que recarrega", async () => {
    getInteracoesMock = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(paginaConjunto());
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <BibliotecaClient initialStatus={null} initialTipo={null} />
      </NextIntlClientProvider>,
    );
    expect(await screen.findByText("error")).toBeTruthy();
    fireEvent.click(screen.getByText("retry"));
    await waitFor(() => expect(screen.getAllByTestId("biblioteca-item")).toHaveLength(4));
  });
});
