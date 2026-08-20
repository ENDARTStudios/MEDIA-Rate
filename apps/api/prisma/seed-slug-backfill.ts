/* eslint-disable no-console */
// T330 — BACKFILL do slug canônico (slugify(titulo)) na coluna midia.slug.
//
// Idempotente: só atualiza quando o slug difere do armazenado. Roda uma vez
// após a migration 20260819_midia_slug. Uso:
//   npm run db:seed:slugs
import { PrismaClient } from "@prisma/client";
import { bootstrapRlsSeed } from "../src/common/rls-context.js";
import { slugify } from "../src/common/slugify.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // FORCE RLS em midia exige contexto de escrita ADMIN (midia_*_curator).
  await bootstrapRlsSeed(prisma);

  const midias = await prisma.midia.findMany({
    select: { id: true, titulo: true, slug: true },
  });

  let atualizadas = 0;
  for (const m of midias) {
    const slug = slugify(m.titulo);
    if (slug !== m.slug) {
      await prisma.midia.update({ where: { id: m.id }, data: { slug } });
      atualizadas++;
    }
  }

  console.log(
    `[t330-slug] backfill concluído: ${atualizadas}/${midias.length} mídias atualizadas.`,
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[t330-slug] erro fatal:", String(err).slice(0, 500));
  await prisma.$disconnect();
  process.exit(1);
});
