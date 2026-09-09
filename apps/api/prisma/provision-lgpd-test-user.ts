/* eslint-disable no-console */
// T433/D-446 (caminho B) — provisiona SOMENTE a conta sintética descartável
// lgpd-test@mediarate.test para o teste ao vivo dos direitos LGPD.
// NÃO toca em free@/plus@/premium@/admin@ (outros e2e dependem delas).
// Uso (com DATABASE_URL apontando p/ o banco alvo, ex. proxy público):
//   node --import @swc-node/register/esm-register prisma/provision-lgpd-test-user.ts
// Comportamento de segredo:
// - gera a senha em memória (nunca via argumento/env de entrada);
// - grava E2E_TEST_EMAIL/E2E_TEST_PASSWORD no .env RAIZ (gitignored),
//   por upsert de linhas (preserva o restante do arquivo);
// - imprime APENAS status (nunca a senha, a URL ou PII);
// - em erro, imprime mensagem sanitizada (sem URL/token/senha).
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { bootstrapRlsSeed } from "../src/common/rls-context.js";

const prisma = new PrismaClient();

const EMAIL = "lgpd-test@mediarate.test";

function sanitizar(msg: string): string {
  return String(msg ?? "")
    .replace(/:[^:@/\s]+@/g, ":***@")
    .replace(/password[^,;\s}]*/gi, "password=***")
    .replace(/token[^,;\s}]*/gi, "token=***")
    .slice(0, 300);
}

function upsertEnv(raiz: string, email: string, senha: string): void {
  const caminho = join(raiz, ".env");
  const linhas: string[] = existsSync(caminho)
    ? readFileSync(caminho, "utf8").split("\n")
    : [];
  const semAntigas = linhas.filter(
    (l) => !/^E2E_TEST_(EMAIL|PASSWORD)=/.test(l.trim()),
  );
  while (semAntigas.length > 0 && semAntigas[semAntigas.length - 1].trim() === "") {
    semAntigas.pop();
  }
  semAntigas.push(`E2E_TEST_EMAIL=${email}`, `E2E_TEST_PASSWORD=${senha}`);
  writeFileSync(caminho, semAntigas.join("\n") + "\n", "utf8");
}

async function main(): Promise<void> {
  await bootstrapRlsSeed(prisma);
  const senha = randomBytes(24).toString("base64url");
  const passwordHash = await argon2.hash(senha, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const papelUser = await prisma.papel.upsert({
    where: { nome: "USER" },
    create: { nome: "USER" },
    update: {},
  });

  await prisma.usuario.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      password_hash: passwordHash,
      nome: "Teste LGPD",
      email_verificado_em: new Date(),
    },
    update: {
      password_hash: passwordHash,
      nome: "Teste LGPD",
      email_verificado_em: new Date(),
    },
  });
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email: EMAIL } });

  await prisma.usuarioPlano.upsert({
    where: { usuario_id: usuario.id },
    create: { usuario_id: usuario.id, plano: "FREE", status: "ATIVA" },
    update: { plano: "FREE", status: "ATIVA" },
  });
  await prisma.usuarioPapel.upsert({
    where: { usuario_id_papel_id: { usuario_id: usuario.id, papel_id: papelUser.id } },
    create: { usuario_id: usuario.id, papel_id: papelUser.id },
    update: {},
  });

  // prisma/<arquivo> -> api (..) -> apps (../..) -> raiz (../../..).
  const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  upsertEnv(raiz, EMAIL, senha);
  console.log("[provision-lgpd] lgpd-test conta OK (credencial gravada no .env, nao exibida).");
  await prisma.$disconnect();
}

const isDirectRun =
  import.meta.url === new URL(process.argv[1] ?? "", "file:").href ||
  process.argv[1]?.endsWith("provision-lgpd-test-user.ts");

if (isDirectRun) {
  main().catch(async (err) => {
    console.error("[provision-lgpd] erro fatal:", sanitizar((err as Error)?.message ?? err));
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });
}
