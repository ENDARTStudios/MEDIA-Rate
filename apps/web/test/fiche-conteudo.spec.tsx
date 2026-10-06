import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type * as NextIntl from "next-intl";

/**
 * T163 (Onda B — conteúdo relacionado na ficha):
 * - RelacionadasSection: grafo RelacaoObra com rótulos traduzidos por tipo de
 *   relação, nota editorial e link para a ficha; MESMO_GENERO (fallback de
 *   descobertas) NÃO aparece — não é curadoria editorial.
 * - TemporadasSection: busca /temporadas e alimenta o SeriatedScoreTree
 *   (nota da unidade = média dos episódios com nota; sem nota = honesto).
 */

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof NextIntl>();
  return {
    ...actual,
    useTranslations: () => {
      const t = (key: string, params?: Record<string, unknown>) =>
        params ? `${key}:${JSON.stringify(params)}` : key;
      return t;
    },
  };
});

vi.mock("@/lib/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { RelacionadasSection } from "@/components/ficha/RelacionadasSection";
import { TemporadasSection } from "@/components/ficha/TemporadasSection";
import type { RelacionadaFicha } from "@/lib/types";

const relacao = (over: Partial<RelacionadaFicha>): RelacionadaFicha => ({
  midiaId: "22222222-2222-4222-8222-222222222222",
  slug: "duna-livro",
  titulo: "Duna",
  tipo: "book",
  ano: 1965,
  imagemUrl: null,
  score: 84,
  tipoRelacao: "ADAPTACAO_DE",
  notaEditorial: "Baseado no livro de 1965",
  ...over,
});

describe("RelacionadasSection (T163)", () => {
  it("rotula e linka cada relação; nota editorial visível", () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <RelacionadasSection
          relacoes={[
            relacao({}),
            relacao({
              midiaId: "33333333-3333-4333-8333-333333333333",
              slug: "matrix-reloaded",
              titulo: "Matrix Reloaded",
              tipo: "movie",
              ano: 2003,
              tipoRelacao: "SEQUENCIA_DE",
              notaEditorial: null,
            }),
          ]}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/relacaoTipo\.ADAPTACAO_DE/)).toBeInTheDocument();
    expect(screen.getByText(/relacaoTipo\.SEQUENCIA_DE/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Duna/ });
    expect(link.getAttribute("href")).toBe("/media/duna-livro");
    expect(screen.getByText(/Baseado no livro de 1965/)).toBeInTheDocument();
  });

  it("filtra MESMO_GENERO (fallback de descobertas, não é curadoria)", () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <RelacionadasSection
          relacoes={[
            relacao({ tipoRelacao: "MESMO_GENERO" }),
            relacao({ titulo: "Relação Válida", tipoRelacao: "MESMO_UNIVERSO" }),
          ]}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText(/Duna/)).not.toBeInTheDocument();
    expect(screen.getByText(/Relação Válida/)).toBeInTheDocument();
  });

  it("sem relações não renderiza nada (franchiseNone é do bloco de franquia)", () => {
    const { container } = render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <RelacionadasSection relacoes={[]} />
      </NextIntlClientProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

const TEMPORADAS = [
  {
    numero: 1,
    titulo: "Primeira Temporada",
    ano: 2019,
    poster_url: null,
    episodios: [
      { numero: 1, titulo: "Ep 1", data_exibicao: null, nota_publico: 8.5, nota_critica: 8.0 },
      { numero: 2, titulo: "Ep 2", data_exibicao: null, nota_publico: 9.5, nota_critica: null },
      { numero: 3, titulo: "Ep 3", data_exibicao: null, nota_publico: null, nota_critica: null },
    ],
  },
  {
    numero: 2,
    titulo: "Segunda Temporada",
    ano: 2021,
    poster_url: null,
    episodios: [],
  },
];

describe("TemporadasSection (T163)", () => {
  beforeAll(() => {
    window.matchMedia =
      window.matchMedia ??
      (() => ({ matches: false, addEventListener: vi.fn() }) as unknown as MediaQueryList);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("busca /temporadas e renderiza unidades com a média dos episódios com nota", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => TEMPORADAS,
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TemporadasSection midiaId="11111111-1111-4111-8111-111111111111" />
      </NextIntlClientProvider>,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/midias/11111111-1111-4111-8111-111111111111/temporadas",
      expect.anything(),
    );
    // T1: média de nota_publico (8,5 + 9,5) / 2 = 9 — truncado, sem arredondar.
    await waitFor(() => expect(screen.getByText(/numero":1/)).toBeInTheDocument());
    expect(screen.getByText(/numero":2/)).toBeInTheDocument();
    expect(screen.getByText("9.0")).toBeInTheDocument();
  });

  it("sem temporadas → estado honesto do SeriatedScoreTree", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TemporadasSection midiaId="11111111-1111-4111-8111-111111111111" />
      </NextIntlClientProvider>,
    );
    await waitFor(() => expect(screen.getByText(/noUnits/)).toBeInTheDocument());
  });
});
