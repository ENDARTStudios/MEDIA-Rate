import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * T097/D-557 — guarda anti-regressão de colunas sensíveis (LGPD).
 *
 * Congela o conjunto atual de colunas com nome sensível do schema Prisma.
 * Um NOVO campo sensível (email/telefone/cpf/endereço/documento/…) só entra
 * se este teste for atualizado CONSCIENTEMENTE junto com um plano de
 * cifragem/blind index (ver docs/lgpd-column-encryption-plan.md) — sem isso
 * o teste falha e o PR não passa, impedindo a regressão de expor PII nova
 * em repouso sem decisão.
 *
 * A allowlist abaixo foi gerada do schema em 2026-09-26 (D-557):
 * cifragem adiada para pós-Beta; compensações ativas (PII mask T049/D-543,
 * AuditLog sanitizado T055/D-545, argon2id, tokens hash, TLS, LGPD
 * export/delete, DTO allowlist).
 */
const ALLOWLIST_SENSIVEIS = [
  "Usuario.email",
  "Usuario.email_verificado_em",
  "Usuario.email_verification_token_hash",
  "Usuario.email_verification_expira_em",
  "WaitlistNotify.email",
] as const;

function colunasSensiveis(schema: string): string[] {
  let model: string | null = null;
  const achados: string[] = [];
  for (const linha of schema.split(/\r?\n/)) {
    const mModel = linha.match(/^model\s+(\w+)\s*\{/);
    if (mModel) {
      model = mModel[1];
      continue;
    }
    if (/^\}/.test(linha)) {
      model = null;
      continue;
    }
    const mCampo = linha.match(/^\s{2}(\w+)\s+(?:String|DateTime)\b/);
    if (
      mCampo &&
      model &&
      /email|telefone|phone|cpf|endereco|documento|nascimento/i.test(mCampo[1])
    ) {
      achados.push(`${model}.${mCampo[1]}`);
    }
  }
  return [...new Set(achados)];
}

describe("T097/D-557 — guardiã de colunas sensíveis (LGPD)", () => {
  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "../prisma/schema.prisma");
  const schema = readFileSync(schemaPath, "utf8");

  it("allowlist corresponde exatamente às colunas sensíveis do schema", () => {
    const atuais = colunasSensiveis(schema);
    const permitidas = [...ALLOWLIST_SENSIVEIS].sort();
    expect(atuais.sort()).toEqual(permitidas);
  });

  it("novas colunas sensíveis exigem decisão consciente (mensagem orienta o plano)", () => {
    const atuais = colunasSensiveis(schema);
    const novas = atuais.filter(
      (c) => !ALLOWLIST_SENSIVEIS.includes(c as (typeof ALLOWLIST_SENSIVEIS)[number]),
    );
    if (novas.length > 0) {
      throw new Error(
        `Colunas sensíveis novas sem plano de cifragem/blind index: ${novas.join(", ")}. ` +
          "Atualize ALLOWLIST_SENSIVEIS apenas com a decisão registrada em DECISOES.md " +
          "e o plano em docs/lgpd-column-encryption-plan.md (D-557).",
      );
    }
    expect(novas).toEqual([]);
  });
});
