/**
 * T192 (CodeQL js/path-injection) — guard de caminho para filesystem.
 *
 * Puro e determinístico: valida segmentos (rejeita traversal, absoluto, null
 * byte/control chars, separadores e double-encoding) e garante contenção do
 * caminho final dentro de uma base permitida (resolve + startsWith).
 */
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import {
  CaminhoBloqueadoError,
  caminhoContidoNaBase,
  garantirContencao,
  segmentoSeguro,
} from "../src/common/path-guard.js";

const BASE = path.resolve("/tmp/base-uploads");

describe("T192 — segmentoSeguro", () => {
  it.each([
    "abc-123",
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-12d3-a456-426614174000-w640.webp",
    "a b.png",
    "acentuação.png",
    "arquivo_2024.tar.gz",
  ])("aceita segmento legítimo: %s", (seg) => {
    expect(segmentoSeguro(seg)).toBe(seg);
  });

  it.each([
    "",
    ".",
    "..",
    "../etc/passwd",
    "..\\windows\\system32",
    "/etc/passwd",
    "\\windows",
    "C:\\windows\\system32\\config\\SAM",
    "file\u0000.png",
    "a\u0001b.png",
    "a\nb.png",
    "%2e%2e",
    "..%2f",
    "..%252f",
    "%2e%2e%2fetc%2fpasswd",
    "....//",
    "a/b",
    "a\\b",
  ])("rejeita segmento perigoso: %j", (seg) => {
    try {
      segmentoSeguro(seg);
      expect.unreachable("deveria lançar");
    } catch (e) {
      expect(e).toBeInstanceOf(CaminhoBloqueadoError);
    }
  });

  it("mensagem de erro não contém o valor bruto de entrada", () => {
    const perigoso = "../../segredo-sensivel";
    try {
      segmentoSeguro(perigoso);
      expect.unreachable("deveria lançar");
    } catch (e) {
      expect(String((e as Error).message)).not.toContain("segredo-sensivel");
    }
  });
});

describe("T192 — garantirContencao", () => {
  it("aceita caminho dentro da base (inclusive igual à base)", () => {
    expect(garantirContencao(BASE, path.join(BASE, "a", "b.png"))).toBe(
      path.join(BASE, "a", "b.png"),
    );
    expect(garantirContencao(BASE, BASE)).toBe(BASE);
  });

  it("rejeita caminho fora da base (escape)", () => {
    for (const alvo of ["/etc/passwd", path.resolve("/tmp/outra-base/x"), `${BASE}-sufixo/x`]) {
      try {
        garantirContencao(BASE, alvo);
        expect.unreachable(`deveria lançar para ${alvo}`);
      } catch (e) {
        expect(e).toBeInstanceOf(CaminhoBloqueadoError);
        expect((e as CaminhoBloqueadoError).motivo).toBe("escape_da_base");
      }
    }
  });
});

describe("T192 — caminhoContidoNaBase", () => {
  it("monta caminho legítimo contido na base", () => {
    const p = caminhoContidoNaBase(BASE, "123e4567-e89b-12d3-a456-426614174000", "x-1.jpg");
    expect(p).toBe(path.join(BASE, "123e4567-e89b-12d3-a456-426614174000", "x-1.jpg"));
  });

  it.each([["../etc/passwd"], ["..%2fetc"], ["/etc/passwd"], ["a\\b"], ["file\u0000.png"]])(
    "rejeita segmento perigoso em qualquer posição: %j",
    (seg) => {
      expect(() => caminhoContidoNaBase(BASE, "abc", seg)).toThrow(CaminhoBloqueadoError);
      expect(() => caminhoContidoNaBase(BASE, seg, "x.jpg")).toThrow(CaminhoBloqueadoError);
    },
  );
});
