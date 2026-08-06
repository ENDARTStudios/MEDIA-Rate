import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const interactionMock = vi.hoisted(() => {
  const state = {
    map: {} as Record<string, unknown>,
    loaded: false,
    loading: false,
    setStatus: vi.fn(async () => undefined),
    setReaction: vi.fn(async () => undefined),
    setMotivo: vi.fn(async () => undefined),
    clearLocal: vi.fn(),
    fetchAll: vi.fn(async () => undefined),
  };
  return state;
});

const authMock = vi.hoisted(() => ({ isAuthenticated: true }));

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  return {
    ...actual,
    useTranslations: () => (key: string) => key,
    useLocale: () => "pt-BR",
  };
});
vi.mock("@/lib/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    `<a href="${href}">${children}</a>`,
}));
vi.mock("@/stores/use-interaction-store", () => ({
  useInteractionStore: (sel: (s: unknown) => unknown) => sel(interactionMock),
}));
vi.mock("@/stores/use-auth-store", () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel(authMock),
}));
vi.mock("motion/react", () => ({
  useReducedMotion: () => true,
  motion: { div: (props: Record<string, unknown>) => <div {...props} /> },
}));
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    setNodeRef: () => undefined,
    transform: null,
    transition: null,
    attributes: {},
    listeners: {},
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
}));
vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));
vi.mock("@/components/MediaCard", () => ({
  MediaCard: ({ media }: { media: { titulo: string } }) => `<div>${media.titulo}</div>`,
}));

import { StatusReactionControl } from "@/components/interaction/StatusReactionControl";
import { WatchlistCard } from "@/components/watchlist/WatchlistCard";
import {
  WatchlistKanban,
  resolveDropTarget,
  STATUS_MAP,
} from "@/components/watchlist/WatchlistKanban";

describe("T200 — StatusReactionControl", () => {
  beforeEach(() => {
    interactionMock.map = {};
    interactionMock.setStatus.mockClear();
    interactionMock.setReaction.mockClear();
    interactionMock.setMotivo.mockClear();
    interactionMock.fetchAll.mockClear();
  });

  it("compact: 1 toque = QUERO_CONSUMIR, sem abrir menu", () => {
    render(<StatusReactionControl midiaId="m1" mediaType="movie" compact />);
    fireEvent.click(screen.getByTestId("status-quick"));
    expect(interactionMock.setStatus).toHaveBeenCalledWith("m1", "QUERO_CONSUMIR");
    expect(screen.queryByTestId("status-popover")).toBeNull();
  });

  it("full: reações NÃO aparecem quando o status é QUERO (pré-consumo)", () => {
    render(<StatusReactionControl midiaId="m1" currentStatus="QUERO_CONSUMIR" mediaType="movie" />);
    fireEvent.click(screen.getByTestId("status-control-full"));
    expect(screen.getByTestId("status-popover")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "reactionGroup" })).toBeNull();
  });

  it("full: ao selecionar CONCLUIDO habilita as reações (foco visual)", () => {
    render(<StatusReactionControl midiaId="m1" currentStatus="QUERO_CONSUMIR" mediaType="movie" />);
    fireEvent.click(screen.getByTestId("status-control-full"));
    fireEvent.click(screen.getByText("vi"));
    expect(interactionMock.setStatus).toHaveBeenCalledWith("m1", "CONCLUIDO");
    expect(screen.getByRole("group", { name: "reactionGroup" })).toBeTruthy();
  });

  it("full: ABANDONADO oferece motivo opcional (3 chips) e salva ao clicar", () => {
    render(<StatusReactionControl midiaId="m1" currentStatus="ABANDONADO" mediaType="movie" />);
    fireEvent.click(screen.getByTestId("status-control-full"));
    const chips = screen.getByRole("group", { name: "motivoGroup" });
    expect(chips.querySelectorAll("button").length).toBe(3);
    fireEvent.click(screen.getByText("motivo_nao_curti"));
    expect(interactionMock.setMotivo).toHaveBeenCalledWith("m1", "NAO_CURTI");
  });
});

describe("T200 — Kanban reconciliado", () => {
  beforeEach(() => {
    interactionMock.map = {};
    interactionMock.setStatus.mockClear();
    interactionMock.setReaction.mockClear();
    interactionMock.fetchAll.mockClear();
  });

  it("drag→status: resolve o alvo do drop e mapeia para o status de interação", () => {
    const entries = [
      { id: "e1", mediaId: "m1", status: "WANT", media: null as never },
      { id: "e2", mediaId: "m2", status: "WATCHING", media: null as never },
    ] as never[];
    expect(resolveDropTarget("e1", "COMPLETED", entries as never[])).toBe("COMPLETED");
    expect(resolveDropTarget("e1", "e2", entries as never[])).toBe("WATCHING");
    expect(resolveDropTarget("e1", "e1", entries as never[])).toBeNull();
    expect(STATUS_MAP.COMPLETED).toBe("CONCLUIDO");
  });

  it("mover para Concluído abre a reação (reaction-prompt no card)", () => {
    interactionMock.map = {
      m1: { status: "CONCLUIDO", reacao: null, motivoAbandono: null },
    };
    render(
      <WatchlistCard
        entry={{
          id: "e1",
          mediaId: "m1",
          status: "COMPLETED",
          media: {
            id: "m1",
            type: "movie",
            title: "Titulo",
            year: 2026,
            posterUrl: null,
            score: 80,
          },
        }}
        onRemove={() => undefined}
        onMove={() => undefined}
        removing={false}
        showReactionPrompt
      />,
    );
    expect(screen.getByTestId("reaction-prompt")).toBeTruthy();
  });

  it("card com reação mostra selo 👍/👎 (reaction-badge)", () => {
    interactionMock.map = {
      m1: { status: "CONCLUIDO", reacao: "GOSTEI", motivoAbandono: null },
    };
    render(
      <WatchlistCard
        entry={{
          id: "e1",
          mediaId: "m1",
          status: "COMPLETED",
          media: {
            id: "m1",
            type: "movie",
            title: "Titulo",
            year: 2026,
            posterUrl: null,
            score: 80,
          },
        }}
        onRemove={() => undefined}
        onMove={() => undefined}
        removing={false}
      />,
    );
    expect(screen.getByTestId("reaction-badge")).toBeTruthy();
  });

  it("Kanban renderiza 3 colunas, aba Abandonados e hidrata as interações", () => {
    interactionMock.map = {
      m2: {
        status: "ABANDONADO",
        reacao: null,
        motivoAbandono: "FALTA_TEMPO",
        midia: { id: "m2", titulo: "Titulo", tipo: "FILME", score: 70 },
      },
    };
    const entries = [
      {
        id: "e1",
        mediaId: "m1",
        status: "WANT",
        media: { id: "m1", type: "movie", title: "Titulo", year: 2026, posterUrl: null, score: 80 },
      },
      {
        id: "e2",
        mediaId: "m2",
        status: "COMPLETED",
        media: {
          id: "m2",
          type: "game",
          title: "Titulo 2",
          year: 2026,
          posterUrl: null,
          score: 90,
        },
      },
    ] as never[];
    render(
      <WatchlistKanban
        entries={entries as never[]}
        onRemove={() => undefined}
        onMove={() => undefined}
        removingId={null}
      />,
    );
    expect(screen.getByTestId("watchlist-column-WANT")).toBeTruthy();
    expect(screen.getByTestId("watchlist-column-WATCHING")).toBeTruthy();
    expect(screen.getByTestId("watchlist-column-COMPLETED")).toBeTruthy();
    expect(interactionMock.fetchAll).toHaveBeenCalled();
    fireEvent.click(screen.getByText("tabAbandonados"));
    expect(screen.getByTestId("abandonado-card")).toBeTruthy();
  });
});
