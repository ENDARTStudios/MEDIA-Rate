/* eslint-disable no-console */
/**
 * T193 (CodeQL js/clear-text-logging) — logs do seed de origem.
 *
 * Executa o fluxo REAL do seed com `fetch` e `@prisma/client` mockados e
 * `console` espionado: prova que a chave da TMDB (que VAI na query da URL)
 * nunca aparece em log, nem no caminho de erro. Sem banco real, sem rede.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    midia = { updateMany: vi.fn(async () => ({ count: 1 })) };
    $disconnect = vi.fn(async () => undefined);
  },
}));

import { executar, fetchTmdb } from "../prisma/seed-origem.js";

const CHAVE_FIXTURE = "chave-ficticia-de-teste-67890";
const fetchMock = vi.fn();

function respostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.TMDB_API_KEY = CHAVE_FIXTURE;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.exitCode = 0;
});

describe("T193 — seed-origem: logs nunca contêm a chave", () => {
  it("erro da TMDB (401): console.error redigido, sem a chave, com exitCode 1", async () => {
    fetchMock.mockResolvedValueOnce(respostaJson({ status_message: "unauthorized" }, 401));
    await executar();

    const erros = vi
      .mocked(console.error)
      .mock.calls.map((c) => String(c[0]))
      .join("\n");
    // Prova o vetor: a URL chamada REALMENTE continha a chave na query.
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(`api_key=${CHAVE_FIXTURE}`);
    // E o log NÃO contém.
    expect(erros).not.toContain(CHAVE_FIXTURE);
    expect(erros).toContain("TMDB 401");
    expect(erros).toContain("[REDACTED]");
    expect(process.exitCode).toBe(1);
  });

  it("falha de rede (fetch rejeita): log redigido e sanitizado", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError(`fetch failed em ?api_key=${CHAVE_FIXTURE}`));
    await executar();

    const erros = vi
      .mocked(console.error)
      .mock.calls.map((c) => String(c[0]))
      .join("\n");
    expect(erros).not.toContain(CHAVE_FIXTURE);
    expect(erros).toContain("[seed:origem]");
    expect(process.exitCode).toBe(1);
  });

  it("caminho feliz: progresso seguro (contagem) e nenhum padrão sensível", async () => {
    fetchMock
      .mockResolvedValueOnce(
        respostaJson({
          results: [
            { id: 1, origin_country: ["US"] },
            { id: 2 }, // sem country → ignorado
            { id: 3, origin_country: ["JP"] },
          ],
        }),
      )
      .mockResolvedValueOnce(respostaJson({ results: [] }));

    await executar();

    const logs = vi
      .mocked(console.log)
      .mock.calls.map((c) => String(c[0]))
      .join("\n");
    expect(logs).toContain("2 séries com país de origem preenchido");
    expect(logs).not.toContain(CHAVE_FIXTURE);
    expect(vi.mocked(console.error)).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it("fetchTmdb lança erro já redigido (defesa em profundidade)", async () => {
    fetchMock.mockResolvedValueOnce(respostaJson({}, 500));
    await expect(fetchTmdb("/discover/tv?api_key=valor-ficticio")).rejects.toThrow(/\[REDACTED\]/);
  });
});
