import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// T191: o http.utils valida o IP resolvido (anti-SSRF); nos testes o DNS é
// mockado para um IP público — nenhuma resolução real acontece.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

// T-DADOS-05: lookup do IGDB por `where id` (não por `search` textual).
function mockFetch(respostas: { ok?: boolean; status?: number; body: unknown }[]) {
  let indice = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const r = respostas[Math.min(indice++, respostas.length - 1)];
      return {
        ok: r.ok ?? true,
        status: r.status ?? 200,
        async json() {
          return r.body;
        },
        async text() {
          return JSON.stringify(r.body);
        },
      } as Response;
    }),
  );
}

const TOKEN = { access_token: "tok", expires_in: 3600 };

/** Corpo da chamada ao endpoint de games do IGDB (a chamada de token é ignorada). */
function corpoDaBusca(): string {
  const chamada = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("api.igdb.com"));
  return String(chamada?.[1]?.body ?? "");
}

async function carregarAdapter() {
  const { IgdbAdapter } = await import("../src/modules/media-score/adapters/igdb.adapter.js");
  return IgdbAdapter;
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("TWITCH_CLIENT_ID", "cid");
  vi.stubEnv("TWITCH_CLIENT_SECRET", "secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("IgdbAdapter — T-DADOS-05 lookup por id", () => {
  it("id presente: a query usa `where id = 1026` e NÃO usa `search`", async () => {
    mockFetch([
      { body: TOKEN },
      { body: [{ name: "Ōkami HD", slug: "okami-hd", aggregated_rating: 92 }] },
    ]);
    const IgdbAdapter = await carregarAdapter();
    const notas = await new IgdbAdapter("igdb").coletar({
      tipo: "GAME",
      titulo: "Ōkami",
      idsExternos: { igdb: "1026" },
    });
    const corpo = corpoDaBusca();
    expect(corpo).toContain("where id = 1026");
    expect(corpo).not.toContain("search");
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(92);
  });

  it("id canônico diferente do título ainda é aceito (id é a identidade)", async () => {
    mockFetch([
      { body: TOKEN },
      {
        body: [
          {
            name: "The Legend of Zelda: Breath of the Wild",
            slug: "zelda-botw",
            aggregated_rating: 97,
          },
        ],
      },
    ]);
    const IgdbAdapter = await carregarAdapter();
    const notas = await new IgdbAdapter("igdb").coletar({
      tipo: "GAME",
      titulo: "Breath of the Wild",
      idsExternos: { igdb: "7346" },
    });
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(97);
    expect(corpoDaBusca()).toContain("where id = 7346");
  });

  it("sem id utilizável cai no fallback `search`", async () => {
    mockFetch([
      { body: TOKEN },
      { body: [{ name: "Zelda", slug: "zelda", aggregated_rating: 90 }] },
    ]);
    const IgdbAdapter = await carregarAdapter();
    const adapter = new IgdbAdapter("igdb");

    await adapter.coletar({ tipo: "GAME", titulo: "Zelda" });
    expect(corpoDaBusca()).toContain('search "Zelda"');
    expect(corpoDaBusca()).toContain("where aggregated_rating != null");

    vi.mocked(fetch).mockClear();
    mockFetch([{ body: [{ name: "Zelda", slug: "zelda", aggregated_rating: 90 }] }]);
    await adapter.coletar({ tipo: "GAME", titulo: "Zelda", idsExternos: { igdb: "okami" } });
    expect(corpoDaBusca()).toContain("search");
    expect(corpoDaBusca()).not.toContain("where id =");
  });

  it("fallback com name diferente do título devolve [] (caso real: Remember Me)", async () => {
    mockFetch([
      { body: TOKEN },
      { body: [{ name: "Remember, Remember", slug: "remember-remember", aggregated_rating: 70 }] },
    ]);
    const IgdbAdapter = await carregarAdapter();
    const notas = await new IgdbAdapter("igdb").coletar({ tipo: "GAME", titulo: "Remember Me" });
    expect(notas).toEqual([]);
  });

  it("fallback com name igual (acento/caixa/pontuação normalizados) devolve a nota", async () => {
    mockFetch([
      { body: TOKEN },
      { body: [{ name: "OKÁMI:  HD", slug: "okami-hd", aggregated_rating: 89 }] },
    ]);
    const IgdbAdapter = await carregarAdapter();
    const notas = await new IgdbAdapter("igdb").coletar({ tipo: "GAME", titulo: "okami hd" });
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(89);
  });

  it("título com aspas não gera query quebrada", async () => {
    mockFetch([
      { body: TOKEN },
      { body: [{ name: "Remember Me", slug: "remember-me", aggregated_rating: 76 }] },
    ]);
    const IgdbAdapter = await carregarAdapter();
    const notas = await new IgdbAdapter("igdb").coletar({
      tipo: "GAME",
      titulo: 'Remember "Me"',
    });
    const corpo = corpoDaBusca();
    expect(corpo).toContain('search "Remember Me"');
    expect(corpo.match(/"/g)).toHaveLength(2);
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(76);
  });

  it.each([null, 0, -3, undefined])("aggregated_rating %s → []", async (valor) => {
    mockFetch([
      { body: TOKEN },
      {
        body: [
          {
            name: "Okami",
            slug: "okami",
            ...(valor === undefined ? {} : { aggregated_rating: valor }),
          },
        ],
      },
    ]);
    const IgdbAdapter = await carregarAdapter();
    const notas = await new IgdbAdapter("igdb").coletar({
      tipo: "GAME",
      titulo: "Okami",
      idsExternos: { igdb: "1026" },
    });
    expect(notas).toEqual([]);
  });

  it("igdb usa aggregated_rating; igdb_publico usa rating (campos por instância)", async () => {
    mockFetch([
      { body: TOKEN },
      { body: [{ name: "Okami", slug: "okami", aggregated_rating: 92 }] },
    ]);
    const IgdbAdapter = await carregarAdapter();
    await new IgdbAdapter("igdb").coletar({
      tipo: "GAME",
      titulo: "Okami",
      idsExternos: { igdb: "1026" },
    });
    const corpoCritica = corpoDaBusca();
    expect(corpoCritica).toContain(
      "fields name, slug, aggregated_rating, aggregated_rating_count;",
    );
    expect(corpoCritica).not.toContain("fields name, slug, rating, rating_count");

    vi.mocked(fetch).mockClear();
    mockFetch([{ body: [{ name: "Okami", slug: "okami", rating: 88 }] }]);
    const notas = await new IgdbAdapter("igdb_publico").coletar({
      tipo: "GAME",
      titulo: "Okami",
      idsExternos: { igdb: "1026" },
    });
    const corpoPublico = corpoDaBusca();
    expect(corpoPublico).toContain("fields name, slug, rating, rating_count");
    expect(corpoPublico).not.toContain("aggregated_rating");
    expect(notas[0].fonte).toBe("igdb_publico");
    expect(notas[0].rating).toBe(88);
  });
});
