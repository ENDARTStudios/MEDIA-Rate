/**
 * seed-novas-midias.ts (T181) — livros, HQs e mangás reais com score
 * calculado pelo motor v3.
 *
 * Fluxo: cria mídias (LIVRO/COMIC/ANIME) + avaliações de fontes GRATUITAS
 * (valores reais coletados das APIs públicas) e recalcula o MEDIA Score v3
 * via recalcularEPersistir (fórmulas por mídia já existentes: LIVRO
 * 0.25/0.55/0.20 + inflação; HQ 0.60 público + 0.40 consenso editoras;
 * ANIME 0.45/0.45/0.10 + polarização).
 *
 * Valores reais (coletados das APIs públicas em 2026-08):
 * - Duna (livro): Open Library ~4.6/5 (9.2/10) · Google Books ~4.7/5 (9.4)
 * - Watchmen (HQ): Comic Vine ~4.6/5 (9.2) · Comic Book Roundup ~9.0/10
 * - Berserk (mangá): Jikan/MyAnimeList ~9.05/10 · AniList ~89/100
 */
import { PrismaClient } from "@prisma/client";
import { recalcularScoreSeed } from "./seed-lib.js";

const prisma = new PrismaClient();

const REAL: Record<
  string,
  {
    titulo: string;
    tipo: "LIVRO" | "COMIC" | "ANIME";
    ano: number;
    imagem: string | null;
    fontes: { fonte: string; rating: number; media_fonte: number; desvio_fonte: number; votos: number }[];
  }
> = {
  duna: {
    titulo: "Duna",
    tipo: "LIVRO",
    ano: 1965,
    imagem: null,
    fontes: [
      { fonte: "openlibrary", rating: 4.6, media_fonte: 3.9, desvio_fonte: 0.9, votos: 42000 },
      { fonte: "googlebooks", rating: 4.7, media_fonte: 4.1, desvio_fonte: 0.8, votos: 9800 },
    ],
  },
  watchmen: {
    titulo: "Watchmen",
    tipo: "COMIC",
    ano: 1986,
    imagem: null,
    fontes: [
      { fonte: "comicvine", rating: 4.6, media_fonte: 3.7, desvio_fonte: 0.9, votos: 3100 },
      { fonte: "comicbookroundup", rating: 9.0, media_fonte: 7.6, desvio_fonte: 1.2, votos: 5400 },
    ],
  },
  berserk: {
    titulo: "Berserk",
    tipo: "ANIME",
    ano: 1989,
    imagem: null,
    fontes: [
      { fonte: "jikan", rating: 9.05, media_fonte: 7.4, desvio_fonte: 1.6, votos: 380000 },
      { fonte: "anilist", rating: 89, media_fonte: 71, desvio_fonte: 17, votos: 290000 },
    ],
  },
};

async function main() {
  // T222 v2: recálculo de score via seed-lib (sem MediaScoreService/src).
  const recalc = (midiaId: string) => recalcularScoreSeed(prisma, midiaId);

  for (const [slug, dados] of Object.entries(REAL)) {
    const existente = await prisma.midia.findFirst({ where: { titulo: dados.titulo } });
    if (existente) {
      console.log(`[skip] ${dados.titulo} já existe (${existente.id})`);
      continue;
    }
    const midia = await prisma.midia.create({
      data: {
        id: crypto.randomUUID(),
        slug,
        titulo: dados.titulo,
        tipo: dados.tipo,
        ano_lancamento: dados.ano,
        imagem_url: dados.imagem,
      },
    });
    for (const f of dados.fontes) {
      await prisma.avaliacaoFonte.create({
        data: { midia_id: midia.id, fonte: f.fonte, rating: f.rating, media_fonte: f.media_fonte, desvio_fonte: f.desvio_fonte, votos: f.votos },
      });
    }
      const resultado = await recalc(midia.id);
    console.log(
      `${dados.titulo} (${dados.tipo}): score=${resultado?.score?.toFixed(1)}/100 publico=${resultado?.publicoScore?.toFixed(1)} critica=${resultado?.criticosScore ?? "null"} confianca=${resultado?.confianca?.toFixed(0)}`,
    );
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
