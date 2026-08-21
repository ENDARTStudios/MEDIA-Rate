/**
 * seed-livros-sinopse.ts (T383c) — sinopses de livros via OpenLibrary works API
 * (sem chave; Google Books está 403 — chave inválida). Idempotente.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sinopseOpenLibrary(titulo: string) {
  try {
    const s = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(titulo)}&limit=1`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!s.ok) return null;
    const sj = (await s.json()) as { docs?: { key?: string }[] };
    const key = sj.docs?.[0]?.key;
    if (!key) return null;
    await sleep(300);
    const d = await fetch(`https://openlibrary.org${key}.json`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!d.ok) return null;
    const dj = (await d.json()) as { description?: string | { value?: string } };
    const desc = dj.description;
    if (typeof desc === "string") return desc.slice(0, 2000);
    if (desc && typeof desc.value === "string") return desc.value.slice(0, 2000);
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const livros = await prisma.midia.findMany({
    where: { tipo: "LIVRO", sinopse: null, deleted_at: null },
    select: { id: true, titulo: true },
  });
  let ok = 0;
  for (const l of livros) {
    const sinopse = await sinopseOpenLibrary(l.titulo);
    if (sinopse) {
      await prisma.midia.update({ where: { id: l.id }, data: { sinopse } });
      ok++;
    }
    await sleep(300);
  }
  console.log(`[livros-sinopse] total=${livros.length} sinopse=${ok}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
