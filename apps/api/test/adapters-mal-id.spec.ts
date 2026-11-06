import { describe, it, expect, vi, afterEach } from "vitest";
import type { ConsultaMedia } from "../src/modules/media-score/adapters/fonte-adapter.interface.js";
import { MalAdapter } from "../src/modules/media-score/adapters/mal.adapter.js";
import { JikanAdapter } from "../src/modules/media-score/adapters/jikan.adapter.js";

// T191: o http.utils valida o IP resolvido (anti-SSRF); DNS mockado.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

function consulta(over: Partial<ConsultaMedia> = {}): ConsultaMedia {
  return { titulo: "Blade Sangokushi", tipo: "MANGA", ano: 2003, ...over } as ConsultaMedia;
}

describe("MalAdapter — id exato do MAL (T-DADOS-79)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("usa /v2/manga/{id} quando o catálogo tem o id (fonte jikan = id do MAL)", async () => {
    vi.stubEnv("MAL_CLIENT_ID", "teste");
    const chamadas: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        chamadas.push(String(url));
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          async json() {
            return { id: 3015, title: "Fushigi Amedama", mean: 6.75, num_scoring_users: 304 };
          },
        } as Response;
      }),
    );
    const notas = await new MalAdapter().coletar(consulta({ idsExternos: { jikan: "3015" } }));
    expect(chamadas[0]).toContain("/v2/manga/3015");
    expect(chamadas[0]).not.toContain("?q=");
    expect(notas).toHaveLength(1);
    expect(notas[0].rating).toBe(6.75);
    expect(notas[0].votos).toBe(304);
  });

  it("prefere idsExternos.mal quando existe", async () => {
    vi.stubEnv("MAL_CLIENT_ID", "teste");
    const chamadas: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        chamadas.push(String(url));
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          async json() {
            return { id: 7, mean: 8.1, num_scoring_users: 100 };
          },
        } as Response;
      }),
    );
    await new MalAdapter().coletar(consulta({ idsExternos: { mal: "7", jikan: "3015" } }));
    expect(chamadas[0]).toContain("/v2/manga/7");
  });

  it("id que voltou 404 é lacuna honesta (não lança: não prende o passe)", async () => {
    vi.stubEnv("MAL_CLIENT_ID", "teste");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({ ok: false, status: 404, headers: new Headers(), text: async () => "" }) as Response,
      ),
    );
    const notas = await new MalAdapter().coletar(consulta({ idsExternos: { jikan: "999999999" } }));
    expect(notas).toEqual([]);
  });

  it("erro de cota (429) continua lançando — D-cota", async () => {
    vi.stubEnv("MAL_CLIENT_ID", "teste");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({ ok: false, status: 429, headers: new Headers(), text: async () => "" }) as Response,
      ),
    );
    await expect(
      new MalAdapter().coletar(consulta({ idsExternos: { jikan: "3015" } })),
    ).rejects.toThrow();
  });

  it("sem id numérico, cai na busca por título (comportamento anterior preservado)", async () => {
    vi.stubEnv("MAL_CLIENT_ID", "teste");
    const chamadas: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        chamadas.push(String(url));
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          async json() {
            return {
              data: [{ node: { id: 1, title: "Berserk", mean: 9.47, num_scoring_users: 50000 } }],
            };
          },
        } as Response;
      }),
    );
    const notas = await new MalAdapter().coletar(
      consulta({ titulo: "Berserk", idsExternos: { jikan: "slug-legado" } }),
    );
    expect(chamadas[0]).toContain("?q=Berserk");
    expect(notas[0].rating).toBe(9.47);
  });

  it("sem idsExternos também usa a busca", async () => {
    vi.stubEnv("MAL_CLIENT_ID", "teste");
    const chamadas: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        chamadas.push(String(url));
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          async json() {
            return { data: [] };
          },
        } as Response;
      }),
    );
    const notas = await new MalAdapter().coletar(consulta({ idsExternos: undefined }));
    expect(chamadas[0]).toContain("?q=");
    expect(notas).toEqual([]);
  });
});

describe("JikanAdapter — fonte aposentada (T-DADOS-79)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("inativa por padrão: o host está bloqueado no egress de produção", () => {
    vi.stubEnv("MEDIA_JIKAN_ENABLED", "");
    expect(new JikanAdapter().ativo()).toBe(false);
  });

  it("ligável por env se o host voltar", () => {
    vi.stubEnv("MEDIA_JIKAN_ENABLED", "true");
    expect(new JikanAdapter().ativo()).toBe(true);
  });
});
