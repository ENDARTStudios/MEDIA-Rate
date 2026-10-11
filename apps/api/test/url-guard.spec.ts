/**
 * T191 (CodeQL js/request-forgery) — guardas de URL/IP para HTTP outbound.
 *
 * Testes puramente determinísticos: sem rede real (o DNS é injetado como fake).
 * Cobrem: esquema, userinfo, IP literal (inclusive formas alternativas que o
 * parser WHATWG normaliza — ex.: 2130706433 → 127.0.0.1), allowlist de hosts
 * (exato + subdomínio, sem "sufixo armadilha"), classificação de IP perigoso
 * (v4/v6, privados, loopback, link-local, metadata, reservados) e validação do
 * nome resolvido (fail-closed em erro de DNS).
 */
import { describe, it, expect } from "vitest";
import {
  HOSTS_EXTERNOS_PERMITIDOS,
  UrlExternaBloqueadaError,
  assertUrlExternaSegura,
  hostPermitido,
  validarHostExternoResolvido,
  type LookupFn,
} from "../src/common/url-guard.js";
import { ipPerigoso } from "../src/common/ip-guard.js";

describe("T191 — assertUrlExternaSegura (URL guard)", () => {
  it("aceita https de host permitido com path/query", () => {
    const u = assertUrlExternaSegura("https://api.themoviedb.org/3/movie/1?language=pt-BR");
    expect(u.hostname).toBe("api.themoviedb.org");
  });

  it.each([
    ["http://api.themoviedb.org/x", "esquema_nao_permitido"],
    ["ftp://api.themoviedb.org/x", "esquema_nao_permitido"],
    ["file:///etc/passwd", "esquema_nao_permitido"],
    ["data:text/plain;base64,aGVsbG8=", "esquema_nao_permitido"],
    ["https://evil.example/x", "host_nao_permitido"],
    ["https://localhost/x", "host_nao_permitido"],
    ["https://127.0.0.1/x", "ip_direto_bloqueado"],
    ["https://[::1]/x", "ip_direto_bloqueado"],
    ["https://0.0.0.0/x", "ip_direto_bloqueado"],
    ["https://169.254.169.254/latest/meta-data", "ip_direto_bloqueado"],
    ["https://metadata.google.internal/x", "host_nao_permitido"],
    ["https://10.0.0.1/x", "ip_direto_bloqueado"],
    ["https://192.168.1.1/x", "ip_direto_bloqueado"],
    ["https://172.16.0.1/x", "ip_direto_bloqueado"],
    ["https://172.31.255.255/x", "ip_direto_bloqueado"],
    ["https://2130706433/x", "ip_direto_bloqueado"],
    ["https://user:pass@api.themoviedb.org/x", "userinfo_nao_permitido"],
  ])("rejeita %s (motivo %s)", (url, motivo) => {
    try {
      assertUrlExternaSegura(url);
      expect.unreachable("deveria lançar");
    } catch (e) {
      expect(e).toBeInstanceOf(UrlExternaBloqueadaError);
      expect((e as UrlExternaBloqueadaError).motivo).toBe(motivo);
    }
  });

  it("aceita o host RapidAPI legítimo do OpenCritic (regressão T191)", () => {
    const u = assertUrlExternaSegura("https://opencritic-api.p.rapidapi.com/game?name=Hades");
    expect(u.hostname).toBe("opencritic-api.p.rapidapi.com");
  });

  it("hostPermitido: exato e subdomínio sim; sufixo-armadilha não", () => {
    expect(hostPermitido("api.themoviedb.org")).toBe(true);
    expect(hostPermitido("sub.api.tvmaze.com")).toBe(true);
    expect(hostPermitido("api.themoviedb.org.evil.example")).toBe(false);
    expect(hostPermitido("notapitvmaze.com")).toBe(false);
    expect(hostPermitido("evil.example")).toBe(false);
  });

  it("lista de hosts permitidos não contém IPs nem http e inclui os provedores usados", () => {
    for (const h of HOSTS_EXTERNOS_PERMITIDOS) {
      expect(h, `entrada inválida na allowlist: ${h}`).toMatch(/^[a-z0-9.-]+$/);
      expect(h.startsWith("http")).toBe(false);
    }
    for (const esperado of [
      "api.themoviedb.org",
      "api.igdb.com",
      "id.twitch.tv",
      "comicvine.gamespot.com",
      "www.metacritic.com",
      "www.rottentomatoes.com",
      "api.tvmaze.com",
      "kitsu.io",
    ]) {
      expect(HOSTS_EXTERNOS_PERMITIDOS, `faltando host: ${esperado}`).toContain(esperado);
    }
  });
});

describe("T191 — ipPerigoso (classificação de IP)", () => {
  it.each([
    "127.0.0.1",
    "127.8.8.8",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "192.0.2.10",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "ff02::1",
    "2002::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.5",
    "64:ff9b::10.0.0.5",
  ])("perigoso: %s", (ip) => {
    expect(ipPerigoso(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "93.184.216.34", "1.1.1.1", "2606:4700::1111", "::ffff:93.184.216.34"])(
    "público: %s",
    (ip) => {
      expect(ipPerigoso(ip)).toBe(false);
    },
  );
});

describe("T191 — validarHostExternoResolvido (DNS guard, lookup injetado)", () => {
  const u = new URL("https://api.themoviedb.org/3/x");
  const fake =
    (address: string): LookupFn =>
    async () => [{ address, family: address.includes(":") ? 6 : 4 }];

  it("aceita nome que resolve para IP público", async () => {
    await expect(validarHostExternoResolvido(u, fake("93.184.216.34"))).resolves.toBeUndefined();
  });

  it.each(["10.0.0.5", "127.0.0.1", "169.254.169.254", "::1", "fe80::1", "::ffff:10.0.0.5"])(
    "rejeita nome que resolve para %s",
    async (address) => {
      await expect(validarHostExternoResolvido(u, fake(address))).rejects.toBeInstanceOf(
        UrlExternaBloqueadaError,
      );
    },
  );

  it("falha fechada: erro de DNS rejeita", async () => {
    const lookupFalho: LookupFn = async () => {
      throw new Error("ENOTFOUND");
    };
    await expect(validarHostExternoResolvido(u, lookupFalho)).rejects.toBeInstanceOf(
      UrlExternaBloqueadaError,
    );
  });

  it("falha fechada: resposta vazia rejeita", async () => {
    const lookupVazio: LookupFn = async () => [];
    await expect(validarHostExternoResolvido(u, lookupVazio)).rejects.toBeInstanceOf(
      UrlExternaBloqueadaError,
    );
  });
});
