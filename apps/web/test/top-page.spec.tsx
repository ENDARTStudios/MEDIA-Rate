import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type * as NextIntl from "next-intl";

/**
 * T162 (Onda A — Rankings): TopPageClient — hub por tipo com hero/banner do
 * Nº 1, TOP 10 numerado, lançamentos do ano, "por onde começar" (franquias)
 * e categorias (gêneros). Score SEMPRE pelo pipeline score-utils (mangá
 * NUNCA /100 — T147).
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
    useLocale: () => "pt-BR",
  };
});

vi.mock("@/lib/navigation", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => "/top",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { TopPageClient } from "@/components/TopPageClient";
import type { TopPorTipoPayload, TopMidia, TopFranquiaItem } from "@/lib/api";

function midia(overrides: Partial<TopMidia> = {}): TopMidia {
  return {
    id: "m1",
    slug: "filme-a",
    titulo: "Filme A",
    titulo_original: null,
    titulo_en: null,
    titulo_es: null,
    tipo: "FILME",
    ano_lancamento: 2024,
    imagem_url: "https://img/a.jpg",
    score: 87,
    num_fontes: 3,
    ...overrides,
  };
}

function franquiaItem(
  overrides: Partial<TopMidia>,
  ordens: { lancamento: number; cronologica: number | null },
): TopFranquiaItem {
  return { ...midia(overrides), ordens };
}

const PAYLOAD: TopPorTipoPayload = {
  tipo: "FILME",
  ano: 2026,
  top: [
    midia({ id: "m1", titulo: "Filme A", score: 87, num_fontes: 3 }),
    midia({ id: "m2", titulo: "Filme B", slug: "filme-b", score: 81, num_fontes: 2 }),
    midia({ id: "m3", titulo: "Filme C", slug: "filme-c", score: 74, num_fontes: 2 }),
  ],
  lancamentos_ano: [
    midia({ id: "m4", titulo: "Filme 2026", slug: "filme-2026", ano_lancamento: 2026 }),
  ],
  generos: [
    { id: 1, nome: "Ação", slug: "acao", total_midias: 42 },
    { id: 2, nome: "Drama", slug: "drama", total_midias: 17 },
  ],
  franquias: [
    {
      id: "f1",
      nome: "O Senhor dos Anéis",
      slug: "o-senhor-dos-aneis",
      itens: [
        franquiaItem(
          { id: "m10", titulo: "A Sociedade do Anel", slug: "sociedade" },
          { lancamento: 1, cronologica: 1 },
        ),
        franquiaItem(
          { id: "m11", titulo: "As Duas Torres", slug: "duas-torres" },
          { lancamento: 2, cronologica: 2 },
        ),
      ],
    },
  ],
};

describe("TopPageClient (T162 — rankings por tipo)", () => {
  beforeAll(() => {
    window.matchMedia =
      window.matchMedia ??
      (() => ({ matches: false, addEventListener: vi.fn() }) as unknown as MediaQueryList);
  });

  it("hero do Nº 1: título, badge, score no pipeline (87 → 8,7/10) e link para a ficha", () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TopPageClient tipo="movie" payload={PAYLOAD} />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByText("Filme A").length).toBeGreaterThan(0);
    expect(screen.getByText(/heroBadge/)).toBeInTheDocument();
    // Hero + linha do TOP 10 exibem o mesmo valor — ambos no pipeline.
    expect(screen.getAllByText("8,7/10").length).toBeGreaterThanOrEqual(2);
    const ficha = screen.getAllByRole("link", { name: /Filme A/ })[0];
    expect(ficha.getAttribute("href")).toBe("/media/filme-a");
  });

  it("TOP 10 numerado: todas as posições do ranking visíveis", () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TopPageClient tipo="movie" payload={PAYLOAD} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Filme B")).toBeInTheDocument();
  });

  it("mangá NUNCA exibe /100: score 87 → 8,7/10 (T147)", () => {
    const manga: TopPorTipoPayload = {
      ...PAYLOAD,
      tipo: "MANGA",
      top: [
        midia({
          id: "g1",
          slug: "manga-a",
          titulo: "Manga A",
          tipo: "MANGA",
          score: 87,
          num_fontes: 2,
        }),
      ],
      lancamentos_ano: [],
      franquias: [],
    };
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TopPageClient tipo="manga" payload={manga} />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByText("8,7/10").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
  });

  it("lançamentos do ano com o ano do payload e cards de pôster", () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TopPageClient tipo="movie" payload={PAYLOAD} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/lancamentos/)).toBeInTheDocument();
    expect(screen.getByTestId("top-lancamentos")).toBeInTheDocument();
    expect(screen.getByText("Filme 2026")).toBeInTheDocument();
  });

  it("por onde começar: franquia com itens ordenados", () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TopPageClient tipo="movie" payload={PAYLOAD} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("O Senhor dos Anéis")).toBeInTheDocument();
    expect(screen.getByText("A Sociedade do Anel")).toBeInTheDocument();
    expect(screen.getByText("As Duas Torres")).toBeInTheDocument();
    expect(screen.getByText(/porOndeComecarHint/)).toBeInTheDocument();
  });

  it("categorias: chips de gênero linkam para /catalog com tipo+genero", () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TopPageClient tipo="movie" payload={PAYLOAD} />
      </NextIntlClientProvider>,
    );
    const chip = screen.getByRole("link", { name: /Ação/ });
    expect(chip.getAttribute("href")).toContain("/catalog?type=movie&genero=acao");
  });

  it("contagem de fontes do score é exibida (transparência T408)", () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TopPageClient tipo="movie" payload={PAYLOAD} />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByText(/fontes/).length).toBeGreaterThan(0);
  });

  it("payload null → estado de erro; top vazio → estado vazio", () => {
    const { unmount } = render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TopPageClient tipo="movie" payload={null} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/erro/)).toBeInTheDocument();
    unmount();
    const vazio: TopPorTipoPayload = {
      ...PAYLOAD,
      top: [],
      lancamentos_ano: [],
      franquias: [],
      generos: [],
    };
    render(
      <NextIntlClientProvider locale="pt-BR" messages={{}}>
        <TopPageClient tipo="movie" payload={vazio} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/empty/)).toBeInTheDocument();
  });
});
