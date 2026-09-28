import { describe, it, expect, vi, afterEach } from "vitest";
import { getCatalog } from "@/lib/api";

/**
 * BETA-GAP-10 / T127 — no modo BUSCA (`/api/v1/search`), o backend casa
 * título/sinopse mas não aplica ano/ordenação. O catálogo passa a aplicar
 * esses filtros localmente a partir dos dados reais do resultado.
 */

interface It {
  id: string;
  titulo: string;
  tipo: string;
  ano_lancamento: number;
  sinopse: string;
  imagem_url: string | null;
  slug: string;
}

function it_(id: string, titulo: string, ano: number): It {
  return {
    id,
    titulo,
    tipo: "FILME",
    ano_lancamento: ano,
    sinopse: "",
    imagem_url: null,
    slug: `s-${id}`,
  };
}

function stubSearch(items: It[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ items, total: items.length }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

describe("getCatalog — busca aplica ano/ordem (BETA-GAP-10/T127)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("anoMin/anoMax filtram os resultados da busca", async () => {
    stubSearch([it_("1", "Alpha", 1990), it_("2", "Beta", 2005), it_("3", "Gamma", 2020)]);
    const r = await getCatalog({ search: "a", anoMin: 2000, anoMax: 2010, limit: 12 });
    expect(r.items.map((i) => i.title)).toEqual(["Beta"]);
  });

  it("sort=title ordena alfabeticamente na busca", async () => {
    stubSearch([it_("1", "Zeta", 2000), it_("2", "Alpha", 2001), it_("3", "Beta", 2002)]);
    const r = await getCatalog({ search: "a", sort: "title", limit: 12 });
    expect(r.items.map((i) => i.title)).toEqual(["Alpha", "Beta", "Zeta"]);
  });
});
