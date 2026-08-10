import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { RelatedWorksBlock } from "@/components/discovery/RelatedWorksBlock";
import { WatchlistCrossPrompt } from "@/components/discovery/WatchlistCrossPrompt";
import { relationLabelKey } from "@/components/discovery/RelatedCard";
import { relacaoFromApi } from "@/lib/api-relations";

const messages = {
  discovery: {
    relatedWorksTitle: "Essa história também está em...",
    becauseYouConsumed: "Porque você viu/leu/jogou {titulo}",
    becauseYouConsumedSub: "sub",
    crossPromptTitle: "Isso também existe em outra mídia — adicionar também?",
    addToo: "Adicionar",
    added: "Adicionado ✓",
    dismiss: "Dispensar",
    adaptedFrom: "Baseado na obra original",
    sequelOf: "Continuação",
    prequelOf: "Prequela",
    spinoffOf: "Spin-off",
    sameUniverse: "Mesmo universo",
    sameRealStory: "Mesmo fato real",
  },
  catalog: {
    filme: "Filme",
    serie: "Série",
    game: "Game",
    livro: "Livro",
    comic: "HQ",
    manga: "Mangá",
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function mockRelacoes(relacoes: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ midiaId: "m1", relacoes }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

const RELACAO_API = {
  id: "r1",
  tipo: "ADAPTACAO_DE",
  nota_editorial: "Baseado no livro de 1965",
  direcao: "saida",
  midia: {
    id: "livro-1",
    titulo: "Duna",
    tipo: "LIVRO",
    imagem_url: null,
    score: 95,
    ano_lancamento: 1965,
    generos: [],
  },
};

describe("T199 — descoberta cross-mídia", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("RelatedWorksBlock renderiza com 1 relação (1 aresta ativa)", async () => {
    mockRelacoes([RELACAO_API]);
    renderWithProviders(<RelatedWorksBlock mediaId="m1" />);
    const cards = await screen.findAllByTestId("related-card");
    expect(cards.length).toBe(1);
    expect(screen.getByText("Duna")).toBeTruthy();
    expect(screen.getByTestId("related-score").textContent).toContain("95");
  });

  it("RelatedWorksBlock não renderiza sem relações (matriz de ausência)", async () => {
    mockRelacoes([]);
    const { container } = renderWithProviders(<RelatedWorksBlock mediaId="m2" />);
    await waitFor(() => expect(screen.queryByTestId("related-works")).toBeNull());
    expect(container.querySelector("[data-testid=related-works]")).toBeNull();
  });

  it("RelatedWorksBlock oculta o bloco quando a fonte falha (graceful)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 })),
    );
    const { container } = renderWithProviders(<RelatedWorksBlock mediaId="m3" />);
    await waitFor(() => expect(container.querySelector("[data-testid=related-works]")).toBeNull());
  });

  it("WatchlistCrossPrompt: prompt com relação renderiza com ação de 1 clique", async () => {
    mockRelacoes([RELACAO_API]);
    renderWithProviders(<WatchlistCrossPrompt mediaId="m1" open onDismiss={() => undefined} />);
    expect(await screen.findByText("Adicionar")).toBeTruthy();
    expect(screen.getByText("Duna")).toBeTruthy();
  });

  it("WatchlistCrossPrompt não renderiza fechado (open=false)", () => {
    mockRelacoes([RELACAO_API]);
    const { container } = renderWithProviders(
      <WatchlistCrossPrompt mediaId="m1" open={false} onDismiss={() => undefined} />,
    );
    expect(container.querySelector("[data-testid=watchlist-cross-prompt]")).toBeNull();
  });

  it("relationLabelKey cobre todos os tipos da tabela", () => {
    expect(relationLabelKey("ADAPTACAO_DE")).toBe("adaptedFrom");
    expect(relationLabelKey("SEQUENCIA_DE")).toBe("sequelOf");
    expect(relationLabelKey("PREQUELA_DE")).toBe("prequelOf");
    expect(relationLabelKey("SPINOFF_DE")).toBe("spinoffOf");
    expect(relationLabelKey("MESMO_UNIVERSO")).toBe("sameUniverse");
    expect(relationLabelKey("MESMA_HISTORIA_REAL")).toBe("sameRealStory");
  });

  it("relacaoFromApi mapeia API → modelo do card (slug derivado)", () => {
    const r = relacaoFromApi(RELACAO_API as never);
    expect(r.midia.slug).toBe("duna");
    expect(r.midia.score).toBe(95);
    expect(r.tipo).toBe("ADAPTACAO_DE");
  });
});
