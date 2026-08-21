/** seed-livros-wikipedia.ts (T383, D-354) — sinopses residuais de livros via
 *  Wikipedia REST summary (keyless). PT primeiro, EN como fallback. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function wiki(lang: string, titulo: string) {
  try {
    const u = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`;
    const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { extract?: string; thumbnail?: { source?: string } };
    if (!j.extract) return null;
    return { sinopse: j.extract.slice(0, 2000), capa: j.thumbnail?.source ?? null };
  } catch {
    return null;
  }
}

async function main() {
  const livros = await prisma.midia.findMany({
    where: { tipo: "LIVRO", sinopse: null, deleted_at: null },
    select: { id: true, titulo: true, titulo_original: true, imagem_url: true },
  });
  let sinopseOk = 0;
  let capaOk = 0;
  for (const l of livros) {
    let e = await wiki("pt", l.titulo);
    if (!e && l.titulo_original) e = await wiki("en", l.titulo_original);
    if (e) {
      const data: { sinopse?: string; imagem_url?: string } = {};
      if (e.sinopse) {
        data.sinopse = e.sinopse;
        sinopseOk++;
      }
      if (!l.imagem_url && e.capa) {
        data.imagem_url = e.capa;
        capaOk++;
      }
      if (Object.keys(data).length > 0) await prisma.midia.update({ where: { id: l.id }, data });
    }
    await sleep(250);
  }
  console.log(`[livros-wiki] total=${livros.length} sinopse=${sinopseOk} capa=${capaOk}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
