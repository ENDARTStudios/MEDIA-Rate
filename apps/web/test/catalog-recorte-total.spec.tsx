import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import fs from "node:fs";
import path from "node:path";
import { useEffect, type ReactNode } from "react";
import { CatalogFiltersClient } from "@/components/CatalogFiltersClient";
import { TotalDoRecorteProvider, useTotalDoRecorte } from "@/components/catalog/TotalDoRecorte";

/**
 * Contagem do recorte no rodapé da sidebar (conceito v1 §3 bloco 5).
 *
 * O contrato: a sidebar é onde o olho está quando se mexe num filtro, então é ali que o
 * número deve aparecer — e ele vem do `CatalogContent` pelo contexto, não de uma consulta
 * duplicada. Antes da primeira resposta a sidebar **não** mostra "0": mostra o aviso de
 * contagem, porque "zero títulos" seria mentira sobre o acervo.
 */

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/pt-BR/catalog",
}));

vi.mock("@/lib/http", () => ({
  api: { get: vi.fn(async () => []) },
  ApiError: class ApiError extends Error {},
}));

const mensagens = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/messages/pt-BR.json"), "utf8"),
) as Record<string, unknown>;

/** Publica um total, como o CatalogContent faz depois da consulta. */
function PublicaTotal({ total }: { total: number | null }): null {
  const { definirTotal } = useTotalDoRecorte();
  useEffect(() => {
    definirTotal(total);
  }, [total, definirTotal]);
  return null;
}

function renderizar(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="pt-BR" messages={mensagens}>
        <TotalDoRecorteProvider>{ui}</TotalDoRecorteProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("contagem do recorte na sidebar", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("mostra o total publicado pelo conteúdo", () => {
    renderizar(
      <>
        <PublicaTotal total={42} />
        <CatalogFiltersClient />
      </>,
    );
    expect(screen.getByTestId("catalog-recorte-total")).toHaveTextContent("42");
  });

  it("antes da primeira resposta não mostra zero — mostra contagem em curso", () => {
    renderizar(<CatalogFiltersClient />);
    const linha = screen.getByTestId("catalog-recorte-total");
    expect(linha).toHaveTextContent(/contando/i);
    expect(linha).not.toHaveTextContent("0");
  });

  it("atualiza quando o recorte muda", () => {
    const { rerender } = renderizar(
      <>
        <PublicaTotal total={42} />
        <CatalogFiltersClient />
      </>,
    );
    expect(screen.getByTestId("catalog-recorte-total")).toHaveTextContent("42");

    act(() => {
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <NextIntlClientProvider locale="pt-BR" messages={mensagens}>
            <TotalDoRecorteProvider>
              <PublicaTotal total={7} />
              <CatalogFiltersClient />
            </TotalDoRecorteProvider>
          </NextIntlClientProvider>
        </QueryClientProvider>,
      );
    });
    expect(screen.getByTestId("catalog-recorte-total")).toHaveTextContent("7");
  });

  it("diz que o filtro é ao vivo, sem botão aplicar", () => {
    renderizar(<CatalogFiltersClient />);
    expect(screen.getByText(/ao vivo/i)).toBeInTheDocument();
  });
});
