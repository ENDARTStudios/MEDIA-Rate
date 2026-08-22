/* eslint-disable */
// seed-fix-slug-softdeleted.ts (T400/T398, correcao) — a migracao UNIQUE em
// midia.slug falhou (E23505) porque linhas SOFT-DELETED mantinham o slug
// duplicado com uma ativa. Soft-deleted nunca e resolvida (getBySlug filtra
// deleted_at IS NULL), entao NULLar o slug de linhas inativas e seguro e
// elimina a colisao do indice UNIQUE. Idempotente.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const antes = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM midia WHERE deleted_at IS NOT NULL AND slug IS NOT NULL`,
  );
  console.log("softdeleted_com_slug_antes:", JSON.stringify(antes));

  await prisma.$executeRawUnsafe(
    `UPDATE midia SET slug = NULL WHERE deleted_at IS NOT NULL AND slug IS NOT NULL`,
  );

  const dups = await prisma.$queryRawUnsafe(
    `SELECT slug, count(*)::int AS n FROM midia WHERE slug IS NOT NULL
     GROUP BY slug HAVING count(*) > 1 ORDER BY n DESC LIMIT 50`,
  );
  console.log("dups_restantes:", JSON.stringify(dups));

  const total_dups = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS grupos FROM (
       SELECT 1 FROM midia WHERE slug IS NOT NULL
       GROUP BY slug HAVING count(*) > 1
     ) t`,
  );
  console.log("grupos_duplicados_restantes:", JSON.stringify(total_dups));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
