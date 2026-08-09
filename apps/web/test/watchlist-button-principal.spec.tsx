import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { StatusReactionControl } from "@/components/interaction/StatusReactionControl";

/**
 * T249 (C1) — o rótulo principal do botão da watchlist respeita o
 * vocabulário por tipo (QUERO_CONSUMIR → queroVer/queroJogar/queroLer),
 * nos 3 locales. Antes usava 'addStatus' genérico ('Quero consumir'/
 * 'Want to consume'/'Quiero consumir').
 */

const LOCALES: Record<string, Record<string, Record<string, string>>> = {
  "pt-BR": {
    interaction: {
      queroVer: "Quero ver",
      queroJogar: "Quero jogar",
      queroLer: "Quero ler",
      addStatus: "Quero consumir",
    },
  },
  "en-US": {
    interaction: {
      queroVer: "Want to watch",
      queroJogar: "Want to play",
      queroLer: "Want to read",
      addStatus: "Want to consume",
    },
  },
  "es-ES": {
    interaction: {
      queroVer: "Quiero ver",
      queroJogar: "Quiero jugar",
      queroLer: "Quiero leer",
      addStatus: "Quiero consumir",
    },
  },
};

// Store de interação mockada (vazia — sem status atual).
vi.mock("@/stores/use-interaction-store", () => ({
  useInteractionStore: (sel: unknown) =>
    sel ? ({} as never) : { map: {}, setStatus: vi.fn(), setReaction: vi.fn(), setMotivo: vi.fn() },
}));
vi.mock("@/stores/use-auth-store", () => ({
  useAuthStore: () => ({ isAuthenticated: false }),
}));
vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderCom(locale: string, mediaType: string) {
  return render(
    <NextIntlClientProvider locale={locale} messages={LOCALES[locale]}>
      <StatusReactionControl midiaId="m1" mediaType={mediaType} compact />
    </NextIntlClientProvider>,
  );
}

describe("StatusReactionControl (T249/C1) — rótulo principal por tipo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["pt-BR", "game", "Quero jogar"],
    ["en-US", "game", "Want to play"],
    ["es-ES", "game", "Quiero jugar"],
  ] as const)("%s GAME → '%s'", (locale, tipo, esperado) => {
    renderCom(locale, tipo);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe(esperado);
  });

  it.each([
    ["pt-BR", "movie", "Quero ver"],
    ["en-US", "movie", "Want to watch"],
    ["es-ES", "movie", "Quiero ver"],
  ] as const)("%s FILME → '%s'", (locale, tipo, esperado) => {
    renderCom(locale, tipo);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe(esperado);
  });

  it.each([
    ["pt-BR", "book", "Quero ler"],
    ["en-US", "book", "Want to read"],
    ["es-ES", "book", "Quiero leer"],
  ] as const)("%s LIVRO → '%s'", (locale, tipo, esperado) => {
    renderCom(locale, tipo);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe(esperado);
  });

  it("nunca usa 'addStatus' genérico como rótulo principal", () => {
    renderCom("en-US", "game");
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).not.toBe("Want to consume");
  });
});
