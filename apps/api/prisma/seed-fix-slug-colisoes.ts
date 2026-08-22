/** seed-fix-slug-colisoes.ts (T398, P1) — elimina slugs duplicados entre
 *  mídias de tipos diferentes. A mídia MAIS ANTIGA mantém o slug base; as
 *  demais recebem sufixo '-<tipo>'. Idempotente (só reescreve colisões). */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUFIXO: Record<string, string> = {
  FILME: "filme",
  SERIE: "serie",
  GAME: "game",
  LIVRO: "livro",
  COMIC: "quadrinhos",
  MANGA: "manga",
};

async function main() {
  const dup = await prisma.$queryRawUnsafe(
    "SELECT slug FROM midia WHERE slug IS NOT NULL AND deleted_at IS NULL GROUP BY slug HAVING COUNT(*) > 1",
  );
  const slugs = (dup as { slug: string }[]).map((r) => r.slug);

  let corrigidos = 0;
  for (const slug of slugs) {
    const midias = await prisma.midia.findMany({
      where: { slug, deleted_at: null },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
      select: { id: true, tipo: true },
    });
    if (midias.length < 2) continue;

    // A mais antiga mantém o slug base; as demais ganham sufixo do tipo.
    const usados = new Set<string>([slug]);
    for (const m of midias.slice(1)) {
      let novo = `${slug}-${SUFIXO[m.tipo] ?? "outro"}`;
      let i = 2;
      while (usados.has(novo)) {
        novo = `${slug}-${SUFIXO[m.tipo] ?? "outro"}-${i++}`;
      }
      usados.add(novo);
      await prisma.midia.update({ where: { id: m.id }, data: { slug: novo } });
      corrigidos++;
    }
  }

  console.log(`[fix-slugs] grupos=${slugs.length} corrigidos=${corrigidos}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
