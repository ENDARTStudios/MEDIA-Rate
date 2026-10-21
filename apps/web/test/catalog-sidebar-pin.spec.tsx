import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import fs from "node:fs";
import path from "node:path";
import { CatalogFiltersClient } from "@/components/CatalogFiltersClient";

/**
 * Pin da sidebar (conceito v1 — rail com preferência lembrada).
 *
 * O que este spec protege:
 *  - o botão é um ALTERNADOR (`aria-pressed`), não uma ação;
 *  - a preferência é gravada em `localStorage` e relida na visita seguinte;
 *  - desligado, o painel volta ao rail (as classes de hover voltam a mandar na largura);
 *  - `localStorage` indisponível não quebra a página (modo privado) — o pino apenas
 *    não persiste.
 */

const CHAVE = "catalog:sidebar-pinned";

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

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="pt-BR" messages={mensagens}>
        <CatalogFiltersClient />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("pin da sidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("começa recolhido e sem preferência gravada", () => {
    renderizar();
    const pino = screen.getByTestId("catalog-sidebar-pin");
    expect(pino).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem(CHAVE)).toBeNull();
  });

  it("fixar grava a preferência e anuncia o estado", () => {
    renderizar();
    const pino = screen.getByTestId("catalog-sidebar-pin");
    fireEvent.click(pino);
    expect(window.localStorage.getItem(CHAVE)).toBe("1");
    expect(screen.getByTestId("catalog-sidebar-pin")).toHaveAttribute("aria-pressed", "true");
  });

  it("relê a preferência na visita seguinte", () => {
    window.localStorage.setItem(CHAVE, "1");
    renderizar();
    expect(screen.getByTestId("catalog-sidebar-pin")).toHaveAttribute("aria-pressed", "true");
  });

  it("desafixar volta ao rail e grava o desligamento", () => {
    window.localStorage.setItem(CHAVE, "1");
    renderizar();
    fireEvent.click(screen.getByTestId("catalog-sidebar-pin"));
    expect(window.localStorage.getItem(CHAVE)).toBe("0");
    expect(screen.getByTestId("catalog-sidebar-pin")).toHaveAttribute("aria-pressed", "false");
  });
});
