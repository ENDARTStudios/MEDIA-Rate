/* eslint-disable no-console */
// T305 — auditoria read-only de producao: usuarios (email/verificacao), contagem
// de midias/temporadas/episodios e ultimos deploys. STANDALONE em prisma/ (D-275).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const users = await prisma.usuario.findMany({
    select: { email: true, email_verificado_em: true, nome: true },
    orderBy: { email: "asc" },
  });
  console.log("[audit-prod] USUARIOS");
  for (const u of users) {
    console.log(
      `  ${u.email} | verificado=${u.email_verificado_em ? "SIM" : "NAO"} | nome=${u.nome}`,
    );
  }

  const midia = await prisma.midia.count();
  const temporada = await prisma.temporada.count();
  const episodio = await prisma.episodio.count();
  const watchlist = await prisma.watchlistEntry.count();
  console.log(`[audit-prod] midias=${midia} temporadas=${temporada} episodios=${episodio} watchlist=${watchlist}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[audit-prod] erro:", String(err).slice(0, 500));
  await prisma.$disconnect();
  process.exit(1);
});
