import { describe, it, expect, beforeEach } from "vitest";
import { AdminProbingMonitor, adminProbingMonitor } from "../src/common/admin-probing-monitor.js";

/**
 * T203 — monitor anti-probing de superfície admin (negativas 403 e rate limit
 * 429 repetidas). Registro SANITIZADO: a chave usa sha256 da sessão (nunca o
 * token cru, nunca IP/user-agent real); "repetida" só vira true após o limite
 * da janela (log por excedente, decidido pelo chamador).
 */

let agora = 1_000_000;
let m: AdminProbingMonitor;

describe("AdminProbingMonitor (T203 — anti-probing sanitizado)", () => {
  beforeEach(() => {
    agora = 1_000_000;
    m = new AdminProbingMonitor({ now: () => agora, janelaMs: 60_000, limite: 5 });
  });

  it("abaixo do limite: nunca marca repetida", () => {
    for (let i = 0; i < 5; i++) {
      const r = m.registrar("NEGADO", "/api/v1/admin/stats", "sess-abc");
      expect(r.repetida).toBe(false);
    }
  });

  it("acima do limite (5): a 6ª e seguintes são repetidas, com contagem crescente", () => {
    let ultima;
    for (let i = 0; i < 7; i++) {
      ultima = m.registrar("NEGADO", "/api/v1/admin/stats", "sess-abc");
    }
    expect(ultima?.repetida).toBe(true);
    expect(ultima?.contagem).toBe(7);
  });

  it("hash da sessão: NUNCA contém o token cru", () => {
    const r = m.registrar("NEGADO", "/api/v1/admin/lgpd", "sess-token-super-secreto");
    expect(r.hash).not.toContain("sess-token-super-secreto");
    expect(r.hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it("sem sessão → chave anônima (fail-safe do monitor)", () => {
    const r = m.registrar("RATE_LIMIT", "/api/v1/admin/stats", undefined);
    expect(r.hash).toBe("anonima");
  });

  it("fora da janela (60s): contador zera — não persiste punição eterna", () => {
    for (let i = 0; i < 7; i++) m.registrar("NEGADO", "/api/v1/admin/stats", "s1");
    agora += 61_000;
    const r = m.registrar("NEGADO", "/api/v1/admin/stats", "s1");
    expect(r.repetida).toBe(false);
    expect(r.contagem).toBe(1);
  });

  it("chaves diferentes (sessão/rota/tipo) não se misturam", () => {
    for (let i = 0; i < 6; i++) m.registrar("NEGADO", "/api/v1/admin/stats", "s1");
    const outraRota = m.registrar("NEGADO", "/api/v1/admin/usuarios", "s1");
    const outraSessao = m.registrar("NEGADO", "/api/v1/admin/stats", "s2");
    const outroTipo = m.registrar("RATE_LIMIT", "/api/v1/admin/stats", "s1");
    expect(outraRota.repetida).toBe(false);
    expect(outraSessao.repetida).toBe(false);
    expect(outroTipo.repetida).toBe(false);
  });

  it("singleton exportado existe (integração filter/429)", () => {
    expect(adminProbingMonitor.registrar("NEGADO", "/api/v1/admin/stats", "x").contagem).toBe(1);
  });
});
