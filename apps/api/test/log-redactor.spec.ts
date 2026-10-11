/**
 * T193 (CodeQL js/clear-text-logging) — redator de valores sensíveis para logs.
 *
 * Cobre o nível STRING (mensagens soltas, queries com chave, headers) e o nível
 * OBJETO (delega ao sanitizarPii do pii-mask/D-543). Determinístico, sem rede.
 */
import { describe, it, expect } from "vitest";
import {
  MARCA_REDIGIDO,
  redigirErro,
  redigirObjeto,
  redigirTexto,
  resumoSeguro,
} from "../src/common/log-redactor.js";

/** Valores fictícios de teste (nunca valores reais). */
const CHAVE_FIXTURE = "chave-ficticia-de-teste-67890";
const SENHA_FIXTURE = "senha-ficticia-123";
const TOKEN_FIXTURE = "token-ficticio-abcdef";
const EMAIL_FIXTURE = "usuario@example.invalid";
const URL_FIXTURE = "postgresql://usuario_ficticio:senha_ficticia@db.exemplo.invalid:5432/app";

describe("T193 — redigirTexto (nível string)", () => {
  it("redige atribuição de chave em query string (api_key=...)", () => {
    const out = redigirTexto(`GET /discover/tv?api_key=${CHAVE_FIXTURE}&page=1`);
    expect(out).not.toContain(CHAVE_FIXTURE);
    expect(out).toContain("api_key=[REDACTED]");
  });

  it.each([
    `password=${SENHA_FIXTURE}`,
    `senha=${SENHA_FIXTURE}`,
    `secret=${TOKEN_FIXTURE}`,
    `token=${TOKEN_FIXTURE}`,
    `apiKey=${CHAVE_FIXTURE}`,
    `client_secret=${TOKEN_FIXTURE}`,
    `admin_token=${TOKEN_FIXTURE}`,
  ])("redige par sensível: %s", (texto) => {
    const out = redigirTexto(texto);
    expect(out).not.toContain("ficticia");
    expect(out).not.toContain("ficticio");
    expect(out).toContain(MARCA_REDIGIDO);
  });

  it("redige header Authorization/Cookie e Bearer", () => {
    const out = redigirTexto(
      `Authorization: Bearer ${TOKEN_FIXTURE} — Cookie: sess=${TOKEN_FIXTURE}`,
    );
    expect(out).not.toContain(TOKEN_FIXTURE);
    expect(out).toContain("Bearer [REDACTED]");
  });

  it("sanitiza URL de conexão preservando scheme/host (sem user:pass)", () => {
    const out = redigirTexto(`falha ao conectar em ${URL_FIXTURE}`);
    expect(out).not.toContain("usuario_ficticio");
    expect(out).not.toContain("senha_ficticia");
    expect(out).toContain("postgresql://[REDACTED]@db.exemplo.invalid");
  });

  it("mascara e-mail (reuso do pii-mask) e trunca strings longas", () => {
    const out = redigirTexto(`contato ${EMAIL_FIXTURE}`);
    expect(out).not.toContain("usuario@");
    expect(out).toContain("u***@");
    const longa = "x".repeat(900);
    const truncada = redigirTexto(longa);
    expect(truncada.length).toBeLessThan(600);
    expect(truncada.endsWith("…")).toBe(true);
  });

  it("não altera textos legítimos", () => {
    expect(redigirTexto("[seed:origem] 42 séries com país de origem preenchido.")).toBe(
      "[seed:origem] 42 séries com país de origem preenchido.",
    );
  });
});

describe("T193 — redigirObjeto / resumoSeguro (nível objeto)", () => {
  it("redige chaves sensíveis aninhadas e em arrays", () => {
    const out = redigirObjeto({
      usuario: { email: EMAIL_FIXTURE, senha: SENHA_FIXTURE },
      itens: [{ token: TOKEN_FIXTURE }, { slug: "duna-parte-dois" }],
    }) as Record<string, unknown>;
    const texto = JSON.stringify(out);
    expect(texto).not.toContain(SENHA_FIXTURE);
    expect(texto).not.toContain(TOKEN_FIXTURE);
    expect(texto).not.toContain(EMAIL_FIXTURE);
    expect(texto).toContain("duna-parte-dois");
    expect(texto).toContain(MARCA_REDIGIDO);
  });

  it("resumoSeguro devolve JSON sem valores sensíveis e é seguro contra ciclos", () => {
    const ciclo: Record<string, unknown> = { slug: "x" };
    ciclo.self = ciclo;
    const seguro = resumoSeguro({ api_key: CHAVE_FIXTURE, ciclo });
    expect(seguro).not.toContain(CHAVE_FIXTURE);
    expect(() => resumoSeguro(ciclo)).not.toThrow();
  });
});

describe("T193 — redigirErro", () => {
  it("devolve nome+mensagem redigidos, nunca o stack completo", () => {
    const erro = new Error(`TMDB 401: /discover/tv?api_key=${CHAVE_FIXTURE}`);
    const out = redigirErro(erro);
    expect(out).toContain("Error");
    expect(out).toContain("TMDB 401");
    expect(out).not.toContain(CHAVE_FIXTURE);
    expect(out).not.toContain("at ");
    expect(out).toContain(MARCA_REDIGIDO);
  });

  it("aceita valores não-Error", () => {
    expect(redigirErro(`falha com api_key=${CHAVE_FIXTURE}`)).not.toContain(CHAVE_FIXTURE);
  });
});
