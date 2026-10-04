import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type * as NextIntl from "next-intl";

// Incidente Operador (perfil): (1) faltava o card "Quero assistir/jogar/ler"
// entre os indicadores; (2) "Gêneros favoritos" contava interações (70) em vez
// da watchlist (18); (3) "Atividade recente" sempre vazia — o perfil descartava
// o envelope { items } do GET /interacoes (D-525).

const { entriesMock, getMock } = vi.hoisted(() => {
  const entries = [
    {
      id: "e1",
      status: "WANT",
      media: { id: "m1", type: "movie", title: "A", genres: ["Drama", "Crime"] },
    },
    {
      id: "e2",
      status: "WANT",
      media: { id: "m2", type: "series", title: "B", genres: ["Drama"] },
    },
    { id: "e3", status: "WATCHING", media: { id: "m3", type: "game", title: "C", genres: [] } },
    {
      id: "e4",
      status: "COMPLETED",
      media: { id: "m4", type: "movie", title: "D", genres: ["Crime"] },
    },
    {
      id: "e5",
      status: "COMPLETED",
      media: { id: "m5", type: "book", title: "E", genres: ["Drama"] },
    },
    { id: "e6", status: "DROPPED", media: { id: "m6", type: "manga", title: "F", genres: [] } },
  ];
  const atividades = [
    {
      midia_id: "m9",
      status: "CONCLUIDO",
      reacao: null,
      atualizado_em: new Date().toISOString(),
      midia: { id: "m9", titulo: "Filme Ativo", tipo: "FILME" },
    },
  ];
  const get = vi.fn(async (url: string) => {
    if (url.includes("/interacoes")) {
      return { items: atividades, total: 1, porStatus: {}, nextCursor: null };
    }
    // /user/stats com gêneros inflados (70) — NÃO deve mais ser usado p/ chips
    return { generos: { Drama: 22, Acao: 8 }, tipos: {} };
  });
  return { entriesMock: entries, getMock: get };
});

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof NextIntl>();
  return {
    ...actual,
    useTranslations: () => (key: string, _vals?: Record<string, unknown>) => key,
    useLocale: () => "pt-BR",
  };
});
vi.mock("@/stores/use-auth-store", () => ({
  useAuthStore: () => ({
    user: { id: "u1", name: "Edi", plan: "PLUS", createdAt: "2026-07-01T00:00:00Z" },
  }),
}));
vi.mock("@/stores/use-watchlist-store", () => ({
  useWatchlistStore: () => ({
    entries: entriesMock,
    isLoading: false,
    fetchWatchlist: vi.fn(async () => undefined),
  }),
}));
vi.mock("@/lib/http", () => ({ api: { get: getMock } }));
vi.mock("@/lib/navigation", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/genero-labels", () => ({
  generoLabel: (g: string) => g,
}));
vi.mock("@/components/interaction/StatusIcons", () => ({
  statusLabelKey: (_tipo: string, st: string) => `status:${st}`,
  ReactionGlyph: () => null,
}));
vi.mock("@/components/watchlist/WatchlistCard", () => ({
  tituloHumano: (media?: { title?: string } | null) => media?.title ?? null,
}));

import { ProfileContent } from "@/components/ProfileContent";

function renderProfile() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <ProfileContent />
    </NextIntlClientProvider>,
  );
}

describe("ProfileContent (indicadores, gêneros e atividade reais)", () => {
  beforeEach(() => {
    getMock.mockClear();
  });

  it("exibe 5 indicadores: total, quero, consumindo, completos, abandonados", async () => {
    const { container } = renderProfile();
    await vi.waitFor(() => {
      const cards = container.querySelectorAll(".grid > div");
      expect(cards.length).toBe(5);
    });
    const textos = [...container.querySelectorAll(".grid > div")].map((c) => c.textContent);
    expect(textos).toEqual([
      expect.stringContaining("inWatchlist") && expect.stringMatching(/6/),
      expect.stringContaining("wantLabel") && expect.stringMatching(/2/),
      expect.stringContaining("watching") && expect.stringMatching(/1/),
      expect.stringContaining("completed") && expect.stringMatching(/2/),
      expect.stringContaining("dropped") && expect.stringMatching(/1/),
    ]);
  });

  it("gêneros favoritos derivam da WATCHLIST (não das interações/stats)", async () => {
    const { container } = renderProfile();
    await vi.waitFor(() => {
      // Drama conta 2 (e1+e2), Crime 2 (e1+e4) — NÃO os 22 do /user/stats
      expect(container.textContent).toContain("Drama");
      expect(container.textContent).toContain("Crime");
    });
    expect(container.textContent).toContain("2");
    // o stats com Drama 22 não pode vazar para os chips
    expect(container.textContent).not.toContain("22");
    // o perfil nem precisa mais do /user/stats
    const chamouStats = getMock.mock.calls.some(([u]) => String(u).includes("/user/stats"));
    expect(chamouStats).toBe(false);
  });

  it("atividade recente parseia o envelope { items } do GET /interacoes (D-525)", async () => {
    const { container } = renderProfile();
    await vi.waitFor(() => {
      expect(container.querySelectorAll("li").length).toBe(1);
    });
    expect(container.textContent).toContain("Filme Ativo");
    // pede página curta — o perfil mostra só as 10 últimas
    const chamou = getMock.mock.calls.find(([u]) => String(u).includes("/interacoes"));
    expect(String(chamou?.[0])).toContain("limit=10");
  });
});
