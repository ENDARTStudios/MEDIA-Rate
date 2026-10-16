#!/usr/bin/env node
/* global console */
/**
 * D-630 — concede (ou revoga) o papel **ADMIN** de uma conta existente.
 *
 * Para que serve: a área `/admin` exige o papel ADMIN no banco (além do gate server-side e do
 * step-up/2FA). Não havia ferramenta no repositório para conceder esse papel — só scripts de
 * seed de catálogo. Este é o caminho documentado, e ele é **conservador por padrão**:
 *
 *   node scripts/promote-admin.mjs pessoa@exemplo.com            # mostra o que faria (dry-run)
 *   node scripts/promote-admin.mjs pessoa@exemplo.com --apply    # aplica
 *   node scripts/promote-admin.mjs pessoa@exemplo.com --revoke --apply
 *
 * Segurança:
 * - **Nunca imprime a DATABASE_URL** (só o host, e mascarado);
 * - exige `--apply` para escrever (sem a flag, é leitura + plano);
 * - recusa rodar se a URL parecer de produção **sem** `--i-know-its-prod`;
 * - usa o Prisma Client de `apps/api`, então as regras de conexão são as mesmas da aplicação.
 */
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

const [, , email, ...flags] = process.argv;
const APLICAR = flags.includes("--apply");
const REVOGAR = flags.includes("--revoke");
const PROD_OK = flags.includes("--i-know-its-prod");

if (!email || !email.includes("@")) {
  console.error(
    "uso: node scripts/promote-admin.mjs <email> [--revoke] [--apply] [--i-know-its-prod]",
  );
  process.exit(2);
}

/** Carrega DATABASE_URL de .env/.env.local sem imprimir segredo. */
function carregarEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const arq of [".env", "apps/api/.env", ".env.local"]) {
    if (!existsSync(arq)) continue;
    for (const linha of readFileSync(arq, "utf8").split("\n")) {
      const m = linha.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

const url = carregarEnv();
if (!url) {
  console.error("DATABASE_URL não encontrada (.env, apps/api/.env). Nada foi alterado.");
  process.exit(2);
}

let host = "(desconhecido)";
try {
  host = new URL(url).host;
} catch {
  /* URL atípica: segue com o rótulo genérico */
}
const mascarado = host.replace(/^([^.]+)/, (p) => p.slice(0, 3) + "***");
const pareceProd = /railway|production|prod\./i.test(host);
console.log(`banco: ${mascarado}${pareceProd ? "  (parece PRODUÇÃO)" : ""}`);
console.log(
  `ação: ${REVOGAR ? "REVOGAR" : "CONCEDER"} ADMIN para ${email}  [${APLICAR ? "APLICANDO" : "dry-run"}]`,
);

if (pareceProd && !PROD_OK) {
  console.error("Recusado: host de produção. Repita com --i-know-its-prod se for intencional.");
  process.exit(3);
}

const require = createRequire(import.meta.url);
let PrismaClient;
try {
  ({ PrismaClient } = require("../apps/api/node_modules/@prisma/client"));
} catch {
  ({ PrismaClient } = require("@prisma/client"));
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!usuario) {
    console.error(`Nenhuma conta com o e-mail ${email}. Nada foi alterado.`);
    process.exit(4);
  }
  const papel = await prisma.papel.findUnique({ where: { nome: "ADMIN" }, select: { id: true } });
  if (!papel) {
    console.error("Papel ADMIN não existe no banco (rode as migrations/seed). Nada foi alterado.");
    process.exit(5);
  }
  const vinculo = await prisma.usuarioPapel.findFirst({
    where: { usuario_id: usuario.id, papel_id: papel.id },
    select: { id: true },
  });

  if (REVOGAR) {
    if (!vinculo) {
      console.log("A conta já NÃO é admin. Nada a fazer.");
    } else if (APLICAR) {
      await prisma.usuarioPapel.delete({ where: { id: vinculo.id } });
      console.log("ADMIN revogado.");
    } else {
      console.log("[dry-run] revogaria o papel ADMIN desta conta.");
    }
  } else if (vinculo) {
    console.log("A conta já é admin. Nada a fazer.");
  } else if (APLICAR) {
    await prisma.usuarioPapel.create({ data: { usuario_id: usuario.id, papel_id: papel.id } });
    console.log("ADMIN concedido. A próxima sessão já enxerga a área /admin.");
  } else {
    console.log("[dry-run] concederia o papel ADMIN. Repita com --apply para aplicar.");
  }
} catch (e) {
  // Nunca ecoar credenciais: só a mensagem do erro.
  console.error("Falha na operação:", e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
