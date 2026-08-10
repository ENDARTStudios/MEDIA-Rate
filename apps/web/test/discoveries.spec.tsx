import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type * as NextIntl from "next-intl";

const interactionMock = vi.hoisted(() => ({
  setStatus: vi.fn(async () => undefined),
  map: {},
}));

const watchlistMock = vi.hoisted(() => ({
  addToWatchlist: vi.fn(async () => undefined),
}));

const apiDiscoveriesMock = vi.hoisted(() => ({
  getDiscoveries: vi.fn(async () => [] as unknown[]),
  getTasteHistory: vi.fn(async () => [] as unknown[]),
}));

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof NextIntl>();
  const t = (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key;
  t.has = () => false;
  return {
    ...actual,
    useTranslations: () => t,
    useLocale: () => "pt-BR",
  };
});
vi.mock("@/lib/api-discoveries", () => apiDiscoveriesMock);
vi.mock("@/lib/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/stores/use-interaction-store", () => ({
  useInteractionStore: (sel: (s: unknown) => unknown) => sel(interactionMock),
}));
vi.mock("@/stores/use-watchlist-store", () => ({
  useWatchlistStore: (sel: (s: unknown) => unknown) => sel(watchlistMock),
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => `<button>${children}</button>`,
}));
vi.mock("motion/react", () => ({ useReducedMotion: () => true }));

import { DiscoveryFeedCard } from "@/components/dashboard/DiscoveryFeedCard";
import { TrendSummaryPhrase } from "@/components/dashboard/TrendSummaryPhrase";
import { TasteEvolutionChart } from "@/components/dashboard/TasteEvolutionChart";
import { WatchlistCrossPrompt } from "@/components/discovery/WatchlistCrossPrompt";

const discos = [
  {
    fromMediaId: "m1",
    fromMediaType: "FILME",
    toMediaId: "m2",
    toMediaType: "GAME",
    relationType: "ADAPTACAO_DE",
    discoveredAt: "2026-08-01T00:00:00Z",
    fromMedia: { id: "m1", titulo: "Matrix", tipo: "FILME", imagemUrl: null, score: 90 },
    toMedia: { id: "m2", titulo: "Matrix Game", tipo: "GAME", imagemUrl: null, score: 85 },
  },
];

const taste = [
  { month: "2026-02", genreWeights: { "ficcao-cientifica": 0.6, "acao": 0.4 } },
  { month: "2026-03", genreWeights: { "ficcao-cientifica": 0.5, "acao": 0.5 } },
  { month: "2026-04", genreWeights: { "ficcao-cientifica": 0.4, "acao": 0.6 } },
  { month: "2026-05", genreWeights: { "ficcao-cientifica": 0.3, "acao": 0.7 } },
  { month: "2026-06", genreWeights: { "ficcao-cientifica": 0.2, "acao": 0.8 } },
  { month: "2026-07", genreWeights: { "ficcao-cientifica": 0.1, "acao": 0.9 } },
  { month: "2026-08", genreWeights: { "ficcao-cientifica": 0.05, "acao": 0.95 } },
];

describe("T201 — descobertas + evolução de gosto (G4)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    interactionMock.setStatus.mockClear();
  });

  it("DiscoveryFeedCard: resumo 'N este ano' + prévia do feed", async () => {
    apiDiscoveriesMock.getDiscoveries.mockResolvedValue(discos);
    render(<DiscoveryFeedCard />);
    expect(await screen.findByText("discoveriesCountOne")).toBeTruthy();
    expect(screen.getByText("Matrix")).toBeTruthy();
    expect(screen.getByText("Matrix Game")).toBeTruthy();
  });

  it("DiscoveryFeedCard: sem descobertas → empty state com CTA", async () => {
    apiDiscoveriesMock.getDiscoveries.mockResolvedValue([]);
    render(<DiscoveryFeedCard />);
    expect(await screen.findByText("feedEmpty")).toBeTruthy();
    expect(screen.getByText("feedEmptyCta")).toBeTruthy();
  });

  it("DiscoveryFeedCard: fonte indisponível → não renderiza (nunca bloqueia)", async () => {
    apiDiscoveriesMock.getDiscoveries.mockResolvedValue(null as never);
    const { container } = render(<DiscoveryFeedCard />);
    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector("[data-testid=discovery-feed-card]")).toBeNull();
  });

  it("TrendSummaryPhrase: variação acima do limiar → frase de tendência", () => {
    render(<TrendSummaryPhrase data={taste} />);
    // acao 0.4 → 0.95 (6 meses atrás vs agora); fica empatado com o inverso
    // de ficcao-cientifica, mas o maior |delta| dispara a frase.
    expect(screen.getByTestId("trend-phrase")).toBeTruthy();
    expect(screen.getByText(/ficcao-cientifica|acao/)).toBeTruthy();
  });

  it("TrendSummaryPhrase: sem dados → aviso honesto (nunca fabrica)", () => {
    render(<TrendSummaryPhrase data={[]} />);
    expect(screen.getByTestId("trend-no-data")).toBeTruthy();
  });

  it("TrendSummaryPhrase: variação pequena → frase neutra", () => {
    const estavel = Array.from({ length: 7 }, (_, i) => ({
      month: `2026-0${i + 1}`,
      genreWeights: { acao: 0.5, drama: 0.5 },
    }));
    render(<TrendSummaryPhrase data={estavel} />);
    expect(screen.getByTestId("trend-neutral")).toBeTruthy();
  });

  it("TasteEvolutionChart: sem histórico → mensagem (matriz de ausência)", () => {
    render(<TasteEvolutionChart data={[]} />);
    expect(screen.getByText("tasteEvolutionEmpty")).toBeTruthy();
  });

  it("WatchlistCrossPrompt: aceitar 'Adicionar também' envia origemRelacaoId", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              midiaId: "m1",
              relacoes: [
                {
                  id: "rel-1",
                  tipo: "ADAPTACAO_DE",
                  nota_editorial: null,
                  direcao: "saida",
                  midia: {
                    id: "m2",
                    titulo: "Matrix Game",
                    tipo: "GAME",
                    imagem_url: null,
                    score: 85,
                    ano_lancamento: null,
                    generos: [],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    render(<WatchlistCrossPrompt mediaId="m1" open onDismiss={() => undefined} />);
    const add = await screen.findByText("addToo");
    fireEvent.click(add);
    expect(interactionMock.setStatus).toHaveBeenCalledWith("m2", "QUERO_CONSUMIR", {
      origemRelacaoId: "rel-1",
    });
  });
});
