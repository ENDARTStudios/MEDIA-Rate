/**
 * T191 (CodeQL js/request-forgery) — integração do http.utils com as guardas.
 *
 * Sem rede real: `fetch` global e `node:dns/promises` são mockados.
 * Prova: (a) chamada legítima a host permitido funciona; (b) URL proibida falha
 * ANTES de qualquer fetch; (c) redirects são validados hop a hop e limitados;
 * (d) erros não vazam query string (que pode conter chave de API).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

import { lookup } from "node:dns/promises";
import {
  ErroColeta,
  fetchJson,
  fetchTexto,
  postJson,
} from "../src/modules/media-score/adapters/http.utils.js";
import { UrlExternaBloqueadaError } from "../src/common/url-guard.js";

const fetchMock = vi.fn();

function respostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function respostaRedirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(lookup).mockReset();
  vi.mocked(lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("T191 — http.utils: chamadas legítimas", () => {
  it("fetchJson em host permitido funciona e usa redirect manual", async () => {
    fetchMock.mockResolvedValueOnce(respostaJson({ ok: 1 }));
    await expect(fetchJson("https://api.themoviedb.org/3/movie/1?language=pt-BR")).resolves.toEqual(
      {
        ok: 1,
      },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.redirect).toBe("manual");
  });

  it("fetchTexto em host permitido funciona", async () => {
    fetchMock.mockResolvedValueOnce(new Response("conteudo", { status: 200 }));
    await expect(fetchTexto("https://www.metacritic.com/movie/x")).resolves.toBe("conteudo");
  });
});

describe("T191 — http.utils: URLs proibidas falham antes da rede", () => {
  it.each([
    ["https://evil.example/x"],
    ["http://api.themoviedb.org/x"],
    ["https://user:pass@api.themoviedb.org/x"],
    ["https://127.0.0.1/x"],
    ["https://169.254.169.254/latest/meta-data"],
  ])("bloqueia %s sem chamar fetch", async (url) => {
    await expect(fetchJson(url)).rejects.toBeInstanceOf(UrlExternaBloqueadaError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bloqueia quando o DNS resolve para IP privado (antes do fetch)", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }] as never);
    await expect(fetchJson("https://api.themoviedb.org/3/x")).rejects.toBeInstanceOf(
      UrlExternaBloqueadaError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("DNS falho = fail-closed (bloqueia)", async () => {
    vi.mocked(lookup).mockRejectedValueOnce(new Error("ENOTFOUND"));
    await expect(fetchJson("https://api.themoviedb.org/3/x")).rejects.toBeInstanceOf(
      UrlExternaBloqueadaError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("T191 — http.utils: redirect guard", () => {
  it("segue redirect 302 para host permitido (com revalidação)", async () => {
    fetchMock
      .mockResolvedValueOnce(respostaRedirect("https://api.tvmaze.com/search?q=x"))
      .mockResolvedValueOnce(respostaJson({ ok: 2 }));
    await expect(fetchJson("https://api.themoviedb.org/3/x")).resolves.toEqual({ ok: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String((fetchMock.mock.calls[1] as [URL])[0])).toBe("https://api.tvmaze.com/search?q=x");
  });

  it("bloqueia redirect para host não permitido", async () => {
    fetchMock.mockResolvedValueOnce(respostaRedirect("https://evil.example/x"));
    await expect(fetchJson("https://api.themoviedb.org/3/x")).rejects.toBeInstanceOf(
      UrlExternaBloqueadaError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("bloqueia redirect para IP privado", async () => {
    fetchMock.mockResolvedValueOnce(respostaRedirect("https://10.0.0.5/x"));
    await expect(fetchJson("https://api.themoviedb.org/3/x")).rejects.toBeInstanceOf(
      UrlExternaBloqueadaError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("limita cadeia de redirects (loop) e falha com erro estável", async () => {
    fetchMock.mockResolvedValue(respostaRedirect("https://api.themoviedb.org/3/loop"));
    await expect(fetchJson("https://api.themoviedb.org/3/x")).rejects.toBeInstanceOf(ErroColeta);
    expect(fetchMock).toHaveBeenCalledTimes(4); // inicial + 3 saltos
  });

  it("não segue redirect em POST", async () => {
    fetchMock.mockResolvedValueOnce(respostaRedirect("https://api.tvmaze.com/x"));
    await expect(postJson("https://api.igdb.com/v4/games", "query")).rejects.toBeInstanceOf(
      ErroColeta,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("T191 — http.utils: erros sanitizados", () => {
  it("mensagem de erro não vaza query string (chave de API)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("erro", { status: 500 }));
    try {
      await fetchJson("https://api.themoviedb.org/3/x?api_key=VALOR_TOKEM_SINTETICO");
      expect.unreachable("deveria lançar");
    } catch (e) {
      const msg = String((e as Error).message);
      expect(msg).toContain("HTTP 500");
      expect(msg).toContain("api.themoviedb.org");
      expect(msg).not.toContain("VALOR_TOKEM_SINTETICO");
      expect(msg).not.toContain("?");
    }
  });
});
