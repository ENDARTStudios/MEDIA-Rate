/* eslint-disable no-console */
// BETA-GAP-03 / T119 — CLI interna de promoção/demissão de papel (RBAC).
//
// Ferramenta OPERACIONAL (não há endpoint público de autopromoção admin):
// roda com acesso ao banco (`DATABASE_URL`), de forma idempotente e
// não-destrutiva. Nunca imprime e-mail/segredo — apenas o id do usuário.
//
// Uso (a partir de apps/api):
//   ROLE_ACTION=grant ROLE_NAME=ADMIN ROLE_EMAIL=user@example.com npm run db:set-role
//   # ou via argv:
//   npm run db:set-role -- grant ADMIN user@example.com
//   npm run db:set-role -- revoke ADMIN user@example.com
//
// Segurança:
// - exige ação/papel/e-mail explícitos (recusa sem args);
// - papel validado contra o enum `PapelNome`;
// - não permite remover o ÚLTIMO ADMIN (evita lockout operacional);
// - em produção, rodar via túnel (`railway connect postgres --tunnel-only`)
//   com `DATABASE_URL` apontando para o túnel (ver runbook admin-role.md).
import { PrismaClient, PapelNome } from "@prisma/client";
import { bootstrapRlsSeed } from "../src/common/rls-context.js";

const prisma = new PrismaClient();

const ROLES = Object.values(PapelNome) as string[];
const ACOES = ["grant", "revoke"] as const;
type Acao = (typeof ACOES)[number];

function erro(message: string): never {
  throw new Error(message);
}

function parseArgs(): { acao: Acao; papel: PapelNome; email: string } {
  const [argAcao, argPapel, argEmail] = process.argv.slice(2);
  const acao = (argAcao ?? process.env.ROLE_ACTION ?? "").trim();
  const papel = (argPapel ?? process.env.ROLE_NAME ?? "").trim().toUpperCase();
  const email = (argEmail ?? process.env.ROLE_EMAIL ?? "").trim();

  if (!ACOES.includes(acao as Acao)) {
    erro(`Acao obrigatoria: ${ACOES.join("|")} (arg1 ou ROLE_ACTION).`);
  }
  if (!ROLES.includes(papel)) {
    erro(`Papel obrigatorio: ${ROLES.join("|")} (arg2 ou ROLE_NAME).`);
  }
  if (!email || !email.includes("@")) {
    erro("E-mail obrigatorio (arg3 ou ROLE_EMAIL).");
  }
  return { acao: acao as Acao, papel: papel as PapelNome, email };
}

async function contarAdmins(): Promise<number> {
  return prisma.usuarioPapel.count({ where: { papel: { nome: PapelNome.ADMIN } } });
}

async function main(): Promise<void> {
  const { acao, papel, email } = parseArgs();
  await bootstrapRlsSeed(prisma);

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!usuario) erro("Usuario nao encontrado para o e-mail informado.");

  const papelRow = await prisma.papel.upsert({
    where: { nome: papel },
    create: { nome: papel },
    update: {},
  });

  if (acao === "grant") {
    await prisma.usuarioPapel.upsert({
      where: { usuario_id_papel_id: { usuario_id: usuario.id, papel_id: papelRow.id } },
      create: { usuario_id: usuario.id, papel_id: papelRow.id },
      update: {},
    });
  } else {
    if (papel === PapelNome.ADMIN && (await contarAdmins()) <= 1) {
      erro("Recusado: nao e permitido remover o ULTIMO ADMIN (risco de lockout).");
    }
    await prisma.usuarioPapel.deleteMany({
      where: { usuario_id: usuario.id, papel_id: papelRow.id },
    });
  }

  // Log sanitizado: sem e-mail, sem segredo.
  console.log(`[set-role] acao=${acao} papel=${papel} usuario=${usuario.id}`);
  await prisma.$disconnect();
}

const isDirectRun =
  import.meta.url === new URL(process.argv[1] ?? "", "file:").href ||
  process.argv[1]?.endsWith("set-role.ts");

if (isDirectRun) {
  main().catch(async (err) => {
    console.error("[set-role] erro:", String(err).slice(0, 300));
    await prisma.$disconnect();
    process.exit(1);
  });
}
