/** seed-generos-livros.ts (T387a) — gêneros de livros via Google Books
 *  categories (chave funcional D-360). Idempotente (link @@id). */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function gbooksCategories(q: string): Promise<string[]> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return [];
  try {
    const u = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(q)}&maxResults=1&key=${key}`;
    const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const j = (await r.json()) as { items?: { volumeInfo?: { categories?: string[] } }[] };
    return j.items?.[0]?.volumeInfo?.categories ?? [];
  } catch {
    return [];
  }
}

async function main() {
  const livros = await prisma.midia.findMany({
    where: { tipo: "LIVRO", deleted_at: null },
    select: {
      id: true,
      titulo: true,
      titulo_original: true,
      generos: { select: { genero_id: true } },
    },
  });

  let links = 0;
  for (const l of livros) {
    if (l.generos.length > 0) continue;
    const cats = await gbooksCategories(l.titulo_original ?? l.titulo);
    for (const nome of cats) {
      const slug = slugify(nome);
      if (!slug) continue;
      const genero = await prisma.genero.upsert({
        where: { slug },
        update: {},
        create: { nome, slug },
      });
      await prisma.midiaGenero
        .create({ data: { midia_id: l.id, genero_id: genero.id } })
        .catch(() => undefined);
      links++;
    }
    await sleep(250);
  }
  console.log(`[generos-livros] livros=${livros.length} links=${links}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
