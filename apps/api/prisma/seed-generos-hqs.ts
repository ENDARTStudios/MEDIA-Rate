/** seed-generos-hqs.ts (T387a, D-362) — gêneros das 31 HQs via mapa
 *  determinístico (ComicVine não tem categories confiável). Idempotente. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// slug(fonte_id) → gêneros (EN)
const MAPA: Record<string, string[]> = {
  "watchmen": ["super-heroi", "drama", "misterio"],
  "sandman": ["fantasia", "horror", "mitologia"],
  "maus": ["biografia", "historia", "drama"],
  "batman-o-cavaleiro-das-trevas": ["super-heroi", "crime", "drama"],
  "v-de-vinganca": ["super-heroi", "distopia", "politica"],
  "persepolis": ["biografia", "drama", "historia"],
  "saga": ["fantasia", "ficcao-cientifica", "romance"],
  "y-o-ultimo-homem": ["ficcao-cientifica", "drama", "aventura"],
  "preacher": ["fantasia", "horror", "comedia"],
  "the-boys": ["super-heroi", "satira", "acao"],
  "invincible": ["super-heroi", "acao", "drama"],
  "the-walking-dead": ["horror", "drama", "sobrevivencia"],
  "fabulas": ["fantasia", "drama", "misterio"],
  "hellboy-semente-da-destruicao": ["horror", "fantasia", "acao"],
  "sin-city": ["crime", "noir", "acao"],
  "scott-pilgrim": ["comedia", "romance", "acao"],
  "bone": ["fantasia", "aventura", "comedia"],
  "asterios-polyp": ["drama", "romance", "experimental"],
  "fun-home": ["biografia", "drama", "lgbt"],
  "blankets": ["biografia", "romance", "drama"],
  "o-reino-do-amanha": ["super-heroi", "distopia", "drama"],
  "crise-nas-infinitas-terras": ["super-heroi", "aventura", "crossover"],
  "a-piada-mortal": ["super-heroi", "crime", "psicologico"],
  "marvels": ["super-heroi", "drama", "historico"],
  "homem-aranha-azul": ["super-heroi", "romance", "drama"],
  "demolidor-o-homem-sem-medo": ["super-heroi", "crime", "noir"],
  "superman-grandes-astros": ["super-heroi", "ficcao-cientifica", "drama"],
  "all-star-superman": ["super-heroi", "drama", "ficcao-cientifica"],
  "flashpoint": ["super-heroi", "aventura", "crossover"],
  "esquadrao-suicida": ["super-heroi", "acao", "crime"],
  "preacher-ate-o-fim": ["fantasia", "horror", "drama"],
};

async function main() {
  const hqs = await prisma.midia.findMany({
    where: { tipo: "COMIC", deleted_at: null },
    select: { id: true, fonte_id: true, generos: { select: { genero_id: true } } },
  });

  let links = 0;
  for (const h of hqs) {
    if (h.generos.length > 0) continue;
    const generos = MAPA[h.fonte_id] ?? [];
    for (const nome of generos) {
      const slug = slugify(nome);
      const genero = await prisma.genero.upsert({
        where: { slug },
        update: {},
        create: { nome, slug },
      });
      await prisma.midiaGenero
        .create({ data: { midia_id: h.id, genero_id: genero.id } })
        .catch(() => undefined);
      links++;
    }
  }
  console.log(`[generos-hqs] hqs=${hqs.length} links=${links}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
