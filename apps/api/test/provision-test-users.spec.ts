/**
 * T184 — guardas do provisionamento de contas de teste (incidente 2026-10-11).
 *
 * Contexto: o provisionador tinha fallback público de senha e podia criar
 * contas `@mediarate.test` (incluindo ADMIN) em ambiente não-local. As guardas
 * abaixo impedem regressão: senha obrigatória via env (sem fallback), bloqueio
 * de ambiente não-local sem flag explícita e ADMIN nunca fora de local.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  avaliarAmbienteProvisao,
  ehAmbienteLocal,
  podeConcederAdmin,
  resolverSenhaProvisao,
} from "../prisma/provision-guards.js";

const SRC_PROVISION = readFileSync(
  new URL("../prisma/provision-test-users.ts", import.meta.url),
  "utf8",
);
const SRC_SEED = readFileSync(new URL("../prisma/seed.ts", import.meta.url), "utf8");

describe("T184 — guardas de provisionamento", () => {
  it("resolverSenhaProvisao: sem env → erro sanitizado (fallback removido)", () => {
    expect(() => resolverSenhaProvisao({})).toThrow(/TEST_USERS_PASSWORD/);
  });

  it("resolverSenhaProvisao: rejeita senha curta e aceita senha forte", () => {
    expect(() => resolverSenhaProvisao({ TEST_USERS_PASSWORD: "curta1234" })).toThrow(/12/);
    expect(resolverSenhaProvisao({ TEST_USERS_PASSWORD: "senha-forte-exemplo-123" })).toBe(
      "senha-forte-exemplo-123",
    );
  });

  it("resolverSenhaProvisao: mensagem de erro nunca contém o valor informado", () => {
    const fraca = "abc123";
    try {
      resolverSenhaProvisao({ TEST_USERS_PASSWORD: fraca });
      expect.unreachable("deveria lançar");
    } catch (e) {
      expect(String((e as Error).message)).not.toContain(fraca);
    }
  });

  it("ehAmbienteLocal: loopback verdadeiro; remoto/nulo/inválido falso", () => {
    expect(ehAmbienteLocal("postgresql://u:p@localhost:5432/db")).toBe(true);
    expect(ehAmbienteLocal("postgresql://u:p@127.0.0.1:5432/db")).toBe(true);
    expect(ehAmbienteLocal("postgresql://u:p@postgres.railway.internal:5432/db")).toBe(false);
    expect(ehAmbienteLocal(undefined)).toBe(false);
    expect(ehAmbienteLocal("nao-e-url")).toBe(false);
  });

  it("avaliarAmbienteProvisao: bloqueia não-local sem flag; libera com flag + aviso", () => {
    const remoto = "postgresql://u:p@db.exemplo-prod.invalid:5432/db";
    const semFlag = avaliarAmbienteProvisao({ databaseUrl: remoto });
    expect(semFlag.bloqueado).toBe(true);
    expect(semFlag.motivo).toBeTruthy();

    const comFlag = avaliarAmbienteProvisao({ databaseUrl: remoto, allowNonLocal: "1" });
    expect(comFlag.bloqueado).toBe(false);
    expect(comFlag.aviso).toBeTruthy();

    const local = avaliarAmbienteProvisao({ databaseUrl: "postgresql://u:p@localhost:5432/db" });
    expect(local.bloqueado).toBe(false);
  });

  it("podeConcederAdmin: nunca em ambiente não-local", () => {
    expect(podeConcederAdmin(false)).toBe(true);
    expect(podeConcederAdmin(true)).toBe(false);
  });

  it("fonte do provisionamento: sem fallback de senha e com as guardas ligadas", () => {
    expect(SRC_PROVISION).not.toMatch(/TEST_USERS_PASSWORD[^\n]*\?\?/);
    expect(SRC_PROVISION).toContain("resolverSenhaProvisao");
    expect(SRC_PROVISION).toContain("avaliarAmbienteProvisao");
    expect(SRC_PROVISION).toContain("podeConcederAdmin");
  });

  it("fonte do provisionamento: nenhum console.* imprime senha/password", () => {
    const linhas = SRC_PROVISION.split("\n").filter((l) => /console\.(log|warn|error)/.test(l));
    for (const l of linhas) {
      expect(l.toLowerCase()).not.toMatch(/senha|password/);
    }
  });

  it("seed: guarda de ambiente presente (não roda fora de local sem flag)", () => {
    expect(SRC_SEED).toContain("avaliarAmbienteProvisao");
  });
});
