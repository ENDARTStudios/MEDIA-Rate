/* eslint-disable no-console */
// T305 — provisiona (upsert idempotente) os 4 usuarios de teste verificados
// para spot-checks em producao (D-294). NAO destrutivo: nunca apaga dados.
// STANDALONE em prisma/ (D-275). Uso:
//   TEST_USERS_PASSWORD="..." npm run db:provision:test-users
// Em producao, roda via tunnel (`railway connect postgres --tunnel-only`) com
// DATABASE_URL apontando para o tunel — NUNCA via `db:seed` (destrutivo).
import { PrismaClient, type Plano } from "@prisma/client";
import argon2 from "argon2";
import { bootstrapRlsSeed } from "../src/common/rls-context.js";

const prisma = new PrismaClient();

interface TestUser {
  email: string;
  nome: string;
  plano: Plano;
  admin: boolean;
}

const USERS: TestUser[] = [
  { email: "free@mediarate.test", nome: "Teste Free", plano: "FREE", admin: false },
  { email: "plus@mediarate.test", nome: "Teste Plus", plano: "PLUS", admin: false },
  { email: "premium@mediarate.test", nome: "Teste Premium", plano: "PREMIUM", admin: false },
  { email: "admin@mediarate.test", nome: "Teste Admin", plano: "PREMIUM", admin: true },
];

async function main(): Promise<void> {
  await bootstrapRlsSeed(prisma);
  const password = process.env.TEST_USERS_PASSWORD ?? "Senha@123";
  const passwordHash = await argon2.hash(password, {
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
  const papelAdmin = await prisma.papel.upsert({
    where: { nome: "ADMIN" },
    create: { nome: "ADMIN" },
    update: {},
  });

  // Catalogo com generos p/ popular o radar (tipos/generos) dos usuarios de plano.
  const midiasComGenero = await prisma.midia.findMany({
    where: { deleted_at: null, generos: { some: {} } },
    take: 6,
    select: { id: true },
    orderBy: { score: "desc" },
  });

  for (const u of USERS) {
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        password_hash: passwordHash,
        nome: u.nome,
        email_verificado_em: new Date(),
      },
      update: {
        password_hash: passwordHash,
        nome: u.nome,
        email_verificado_em: new Date(),
      },
    });

    // T402: TODOS os planos recebem interações (Free inclusive) para o
    // dashboard renderizar os cards — Free vê preview gated; Plus/Premium real.
    if (midiasComGenero.length > 0) {
      const alvos = midiasComGenero.slice(0, u.plano === "PREMIUM" ? 4 : 2);
      for (let i = 0; i < alvos.length; i++) {
        const concluido = u.plano === "PREMIUM" && i < 2;
        await prisma.usuarioMidiaInteracao.upsert({
          where: { usuario_id_midia_id: { usuario_id: usuario.id, midia_id: alvos[i].id } },
          create: {
            usuario_id: usuario.id,
            midia_id: alvos[i].id,
            status: concluido ? "CONCLUIDO" : "CONSUMINDO",
            concluido_em: concluido ? new Date() : null,
          },
          update: {},
        });
      }
    }

    await prisma.usuarioPlano.upsert({
      where: { usuario_id: usuario.id },
      create: { usuario_id: usuario.id, plano: u.plano, status: "ATIVA" },
      update: { plano: u.plano, status: "ATIVA" },
    });

    await prisma.usuarioPapel.upsert({
      where: { usuario_id_papel_id: { usuario_id: usuario.id, papel_id: papelUser.id } },
      create: { usuario_id: usuario.id, papel_id: papelUser.id },
      update: {},
    });
    if (u.admin) {
      await prisma.usuarioPapel.upsert({
        where: { usuario_id_papel_id: { usuario_id: usuario.id, papel_id: papelAdmin.id } },
        create: { usuario_id: usuario.id, papel_id: papelAdmin.id },
        update: {},
      });
    }
    console.log(
      `[provision] ${u.email} plano=${u.plano} verificado=OK admin=${u.admin ? "SIM" : "nao"}`,
    );
  }
  console.log("[provision] Concluido (4 usuarios upsert, sem exclusao).");
  await prisma.$disconnect();
}

const isDirectRun =
  import.meta.url === new URL(process.argv[1] ?? "", "file:").href ||
  process.argv[1]?.endsWith("provision-test-users.ts");

if (isDirectRun) {
  main().catch(async (err) => {
    console.error("[provision] erro fatal:", String(err).slice(0, 500));
    await prisma.$disconnect();
    process.exit(1);
  });
}
