/**
 * T185/UG-14 — contrato responsivo da densidade da Biblioteca (nível componente).
 *
 * jsdom não calcula layout; a geometria real (colunas efetivas e overflowX em
 * 390x844/1280x800) é coberta pelo E2E `apps/web/e2e/library-density.spec.ts`.
 * Aqui garantimos o CONTRATO de classes que sustenta a correção do overflow:
 * - base mobile = 2 colunas (nenhum degrau de 3 colunas abaixo de `sm`, que
 *   espremia os cards a ~111px em 390px e estourava o rodapé do item);
 * - rodapé do item quebra linha sob pressão (`flex-wrap`) em vez de estourar;
 * - rótulo de status permanece truncável (`min-w-0` + `truncate`).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  return {
    ...actual,
    getInteracoes: (...args: unknown[]) => getInteracoesMock(...args),
    removerInteracao: vi.fn().mockResolvedValue(true),
  };
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

const ISO = new Date("2026-09-21T12:00:00Z").toISOString();
const TIPOS = ["FILME", "SERIE", "GAME", "LIVRO", "COMIC", "MANGA"] as const;

/** Fixture com 8 mídias (mesmo shape do contrato real). */
const CONJUNTO: Interacao[] = Array.from({ length: 8 }, (_, k) => {
  const n = String(k + 1).padStart(2, "0");
  return {
    id: `i${n}`,
    midiaId: `m-${n}`,
    status: "QUERO_CONSUMIR" as const,
    atualizadoEm: ISO,
    midia: {
      id: `m-${n}`,
      slug: `fixture-biblioteca-${n}`,
      titulo: `Fixture Biblioteca ${n}`,
      tipo: TIPOS[k % TIPOS.length],
      anoLancamento: 2000 + k,
      imagemUrl: null,
      score: 70 + k,
    },
  };
});

const PAGINA: InteracoesPagina = {
  items: CONJUNTO,
  total: CONJUNTO.length,
  porStatus: { QUERO_CONSUMIR: CONJUNTO.length, CONSUMINDO: 0, CONCLUIDO: 0, ABANDONADO: 0 },
  nextCursor: null,
};

async function renderBiblioteca() {
  getInteracoesMock = vi.fn().mockResolvedValue(PAGINA);
  render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <BibliotecaClient initialStatus={null} initialTipo={null} />
    </NextIntlClientProvider>,
  );
  await screen.findByTestId("biblioteca-client");
  const itens = await screen.findAllByTestId("biblioteca-item");
  expect(itens.length).toBe(CONJUNTO.length);
}

describe("T185 — contrato responsivo da densidade da Biblioteca", () => {
  it("grid mobile: base de 2 colunas e nenhum degrau de colunas abaixo de sm", async () => {
    await renderBiblioteca();
    const classes = screen.getByTestId("biblioteca-grid").className.split(/\s+/);
    expect(classes, "base mobile = 2 colunas").toContain("grid-cols-2");
    expect(classes.some((c) => /^xs:grid-cols-/.test(c))).toBe(false);
    for (const degrau of classes.filter((c) => /:grid-cols-/.test(c))) {
      expect(degrau, "degraus responsivos começam em sm (640px)").toMatch(
        /^(sm|md|lg|xl|2xl):grid-cols-/,
      );
    }
  });

  it("rodapé do item quebra linha sob pressão (flex-wrap) sem esconder o Remover", async () => {
    await renderBiblioteca();
    const rodape = screen.getAllByTestId("biblioteca-item-footer")[0];
    expect(rodape.className.split(/\s+/), "flex-wrap evita estouro em colunas estreitas").toContain(
      "flex-wrap",
    );
    expect(rodape.querySelector("button")).toBeTruthy();
  });

  it("rótulo de status permanece truncável (min-w-0 + truncate)", async () => {
    await renderBiblioteca();
    const rodape = screen.getAllByTestId("biblioteca-item-footer")[0];
    const rotulo = rodape.querySelector("span");
    expect(rotulo?.className).toContain("min-w-0");
    expect(rotulo?.querySelector("span.truncate")).toBeTruthy();
  });
});
