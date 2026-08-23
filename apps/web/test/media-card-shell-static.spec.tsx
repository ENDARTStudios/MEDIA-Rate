import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { MediaCardShell } from "@/components/media-rate-ui/MediaCardShell";
import type { MediaItem } from "@/components/MediaCard";

/**
 * T405/D-399 U2 — o shell do card renderiza botões ESTÁTICOS (data-*) para a
 * ilha CarouselInteractions delegar, em vez de montar WatchlistButton/
 * StatusReactionControl (zustand/motion) por card.
 */
const tCatalog = (key: string) => key;
const tWatchlist = (key: string) => key;
const tInteraction = (key: string) => key;

const media: MediaItem = {
  id: "abc-123",
  slug: "some-movie",
  titulo: "Some Movie",
  titulo_original: "Some Movie",
  tipo: "FILME",
  ano_lancamento: 2020,
  imagem_url: null,
  score: 8.5,
  numFontes: 3,
};

function renderShell() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={{}}>
      <MediaCardShell
        media={media}
        tCatalog={tCatalog}
        tWatchlist={tWatchlist}
        tInteraction={tInteraction}
        locale="pt-BR"
      />
    </NextIntlClientProvider>,
  );
}

describe("MediaCardShell (D-399 U2)", () => {
  it("renderiza botão estático de watchlist (coração) com data-*", () => {
    const { container } = renderShell();
    const heart = container.querySelector('[data-card-action="watchlist"]');
    expect(heart).toBeTruthy();
    expect(heart?.getAttribute("data-media-id")).toBe("abc-123");
    expect(heart?.getAttribute("data-media-type")).toBe("movie");
    expect(heart?.getAttribute("data-in-watchlist")).toBe("false");
    expect(heart?.getAttribute("aria-expanded")).toBe("false");
  });

  it("renderiza botão estático de status (+) com data-*", () => {
    const { container } = renderShell();
    const status = container.querySelector('[data-card-action="status"]');
    expect(status).toBeTruthy();
    expect(status?.getAttribute("data-media-id")).toBe("abc-123");
    expect(status?.getAttribute("aria-haspopup")).toBe("dialog");
    expect(status?.getAttribute("aria-expanded")).toBe("false");
  });

  it("não monta mais as ilhas antigas por card (CardIslands/zustand)", () => {
    const { container } = renderShell();
    expect(container.querySelector('[data-testid="status-quick"]')).toBeNull();
    expect(container.textContent).not.toContain("CardIslands");
  });
});
