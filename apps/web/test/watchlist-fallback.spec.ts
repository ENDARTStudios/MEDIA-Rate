import { describe, it, expect } from "vitest";
import {
  humanizarId,
  tituloHumano,
  entryToMediaItem,
} from "../src/components/watchlist/WatchlistCard";
import type { WatchlistEntry } from "../src/stores/use-watchlist-store";

describe("T310 — fallback chain da watchlist (nunca UUID cru)", () => {
  it("humanizarId transforma slug em título legível", () => {
    expect(humanizarId("the-last-of-us")).toBe("The Last Of Us");
    expect(humanizarId("berserk_1997")).toBe("Berserk 1997");
  });

  it("humanizarId rejeita UUID e id numérico puro", () => {
    expect(humanizarId("d6cf3d69-a0d0-4536-bef9-4d4356ed7a5f")).toBeNull();
    expect(humanizarId("124364")).toBeNull();
  });

  it("tituloHumano: título → original → id humanizado → null", () => {
    expect(tituloHumano({ title: "Duna" }, "x")).toBe("Duna");
    expect(tituloHumano({ title: " ", tituloOriginal: "Dune" }, "x")).toBe("Dune");
    expect(tituloHumano(null, "the-last-of-us")).toBe("The Last Of Us");
    expect(tituloHumano(null, "d6cf3d69-a0d0-4536-bef9-4d4356ed7a5f")).toBeNull();
  });

  it("entryToMediaItem com título indisponível usa o fallback i18n (nunca o UUID)", () => {
    const entry = {
      id: "e1",
      mediaId: "d6cf3d69-a0d0-4536-bef9-4d4356ed7a5f",
      status: "WANT",
      media: { id: "d6cf3d69-a0d0-4536-bef9-4d4356ed7a5f", title: undefined, dadosParciais: true },
    } as unknown as WatchlistEntry;
    const item = entryToMediaItem(entry, "Título indisponível");
    const t = item as { titulo: string };
    expect(t.titulo).toBe("Título indisponível");
    expect(t.titulo).not.toBe(entry.mediaId);
  });

  it("entryToMediaItem mantém o título real quando existe", () => {
    const entry = {
      id: "e2",
      mediaId: "d6cf3d69-a0d0-4536-bef9-4d4356ed7a5f",
      status: "WANT",
      media: { id: "d6cf3d69-a0d0-4536-bef9-4d4356ed7a5f", title: "Duna", type: "movie" },
    } as unknown as WatchlistEntry;
    const item = entryToMediaItem(entry);
    expect((item as { titulo: string }).titulo).toBe("Duna");
  });
});
