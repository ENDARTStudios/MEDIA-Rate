import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SearchCommand } from "@/components/SearchCommand";

/**
 * T246 — Ctrl+K (Windows/Linux) e ⌘K (Mac) abrem a paleta com foco no
 * input. Guarda: não dispara com foco em input/textarea; hint por plataforma.
 */

const messages = {
  catalog: {
    search: "Buscar mídia",
    typeMovie: "Filme",
    typeSerie: "Série",
    typeGame: "Game",
    typeBook: "Livro",
    typeComic: "HQ",
    typeManga: "Mangá",
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

async function abrirComTecla(modifiers: { ctrlKey?: boolean; metaKey?: boolean }) {
  renderWithProviders(<SearchCommand />);
  fireEvent.keyDown(window, {
    key: "k",
    ctrlKey: modifiers.ctrlKey ?? false,
    metaKey: modifiers.metaKey ?? false,
  } as KeyboardEvent);
  const input = await screen.findByPlaceholderText(/buscar filmes/i);
  return input;
}

describe("SearchCommand (T246) — atalho Ctrl+K / ⌘K", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("Ctrl+K (Windows/Linux) abre a paleta com foco no input", async () => {
    const input = await abrirComTecla({ ctrlKey: true });
    expect(document.activeElement).toBe(input);
  });

  it("⌘K (Mac) abre a paleta com foco no input (paridade)", async () => {
    const input = await abrirComTecla({ metaKey: true });
    expect(document.activeElement).toBe(input);
  });

  it("Ctrl+K com Caps Lock (key 'K') também abre", async () => {
    renderWithProviders(<SearchCommand />);
    fireEvent.keyDown(window, { key: "K", ctrlKey: true } as KeyboardEvent);
    const input = await screen.findByPlaceholderText(/buscar filmes/i);
    expect(document.activeElement).toBe(input);
  });

  it("não abre com foco em input (digitação normal preservada)", async () => {
    renderWithProviders(<SearchCommand />);
    // Um input externo (ex.: filtro do catálogo) focado.
    const externo = document.createElement("input");
    document.body.appendChild(externo);
    externo.focus();
    fireEvent.keyDown(externo, { key: "k", ctrlKey: true } as KeyboardEvent);
    // A paleta não deve abrir.
    expect(screen.queryByPlaceholderText(/buscar filmes/i)).toBeNull();
    document.body.removeChild(externo);
  });
});
