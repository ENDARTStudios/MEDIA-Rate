/** seed-livros-gbooks.ts (D-360) — sinopses de livros via Google Books
 *  (agora 200 após relaxar a restrição de referenciadores). Busca por
 *  titulo_original (EN) quando existir, senão pelo título PT. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function gbooks(q: string) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return null;
  try {
    const u = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(q)}&maxResults=1&key=${key}`;
    const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      items?: { id?: string; volumeInfo?: { description?: string } }[];
    };
    const it = j.items?.[0];
    if (!it) return null;
    let desc = it.volumeInfo?.description ?? null;
    if (!desc && it.id) {
      const d = await fetch(`https://www.googleapis.com/books/v1/volumes/${it.id}?key=${key}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (d.ok) {
        const dj = (await d.json()) as { volumeInfo?: { description?: string } };
        desc = dj.volumeInfo?.description ?? null;
      }
    }
    return desc ? stripHtml(desc).slice(0, 2000) : null;
  } catch {
    return null;
  }
}

async function main() {
  const livros = await prisma.midia.findMany({
    where: { tipo: "LIVRO", sinopse: null, deleted_at: null },
    select: { id: true, titulo: true, titulo_original: true },
  });
  let ok = 0;
  for (const l of livros) {
    const q = l.titulo_original ?? l.titulo;
    const sinopse = await gbooks(q);
    if (sinopse) {
      await prisma.midia.update({ where: { id: l.id }, data: { sinopse } });
      ok++;
    }
  }
  console.log(`[livros-gbooks] total=${livros.length} sinopse=${ok}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
