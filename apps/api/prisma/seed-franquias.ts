/**
 * Seed de franquias/universos (Addendum 2 §7).
 *
 * Define franquias com os IDs TMDB do catálogo; para cada item, busca a mídia
 * existente por (fonte, fonte_id) e vincula com ordens de lançamento e
 * cronológica (null = sem divergência). Franquias com menos de 2 títulos no
 * catálogo são ignoradas. Idempotente.
 *
 * Uso: DATABASE_URL=... npx tsx prisma/seed-franquias.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ItemFranquia {
  fonte: "tmdb" | "tmdb_tv";
  fonteId: string;
  ordemLancamento: number;
  /** Ordem dos eventos na história (omitir quando igual ao lançamento). */
  ordemCronologica?: number;
}

interface DefFranquia {
  nome: string;
  slug: string;
  itens: ItemFranquia[];
}

const FRANQUIAS: DefFranquia[] = [
  {
    nome: "Matrix",
    slug: "matrix",
    itens: [
      { fonte: "tmdb", fonteId: "603", ordemLancamento: 1, ordemCronologica: 1 },
      { fonte: "tmdb", fonteId: "604", ordemLancamento: 2, ordemCronologica: 2 },
      { fonte: "tmdb", fonteId: "605", ordemLancamento: 3, ordemCronologica: 3 },
      { fonte: "tmdb", fonteId: "624860", ordemLancamento: 4, ordemCronologica: 4 },
    ],
  },
  {
    nome: "Star Wars",
    slug: "star-wars",
    itens: [
      { fonte: "tmdb", fonteId: "11", ordemLancamento: 4, ordemCronologica: 1 },
      { fonte: "tmdb", fonteId: "1891", ordemLancamento: 5, ordemCronologica: 2 },
      { fonte: "tmdb", fonteId: "1892", ordemLancamento: 6, ordemCronologica: 3 },
      { fonte: "tmdb", fonteId: "1893", ordemLancamento: 1, ordemCronologica: 4 },
      { fonte: "tmdb", fonteId: "1894", ordemLancamento: 2, ordemCronologica: 5 },
      { fonte: "tmdb", fonteId: "1895", ordemLancamento: 3, ordemCronologica: 6 },
      { fonte: "tmdb", fonteId: "181808", ordemLancamento: 7, ordemCronologica: 7 },
      { fonte: "tmdb", fonteId: "181812", ordemLancamento: 8, ordemCronologica: 8 },
    ],
  },
  {
    nome: "O Senhor dos Anéis",
    slug: "o-senhor-dos-aneis",
    itens: [
      { fonte: "tmdb", fonteId: "120", ordemLancamento: 1, ordemCronologica: 1 },
      { fonte: "tmdb", fonteId: "121", ordemLancamento: 2, ordemCronologica: 2 },
      { fonte: "tmdb", fonteId: "122", ordemLancamento: 3, ordemCronologica: 3 },
    ],
  },
  {
    nome: "Harry Potter",
    slug: "harry-potter",
    itens: [
      { fonte: "tmdb", fonteId: "671", ordemLancamento: 1 },
      { fonte: "tmdb", fonteId: "672", ordemLancamento: 2 },
      { fonte: "tmdb", fonteId: "673", ordemLancamento: 3 },
      { fonte: "tmdb", fonteId: "674", ordemLancamento: 4 },
      { fonte: "tmdb", fonteId: "675", ordemLancamento: 5 },
      { fonte: "tmdb", fonteId: "767", ordemLancamento: 6 },
      { fonte: "tmdb", fonteId: "12444", ordemLancamento: 7 },
      { fonte: "tmdb", fonteId: "12445", ordemLancamento: 8 },
    ],
  },
  {
    nome: "Duna",
    slug: "duna",
    itens: [
      { fonte: "tmdb", fonteId: "438631", ordemLancamento: 1 },
      { fonte: "tmdb", fonteId: "693134", ordemLancamento: 2 },
    ],
  },
  {
    nome: "John Wick",
    slug: "john-wick",
    itens: [
      { fonte: "tmdb", fonteId: "245891", ordemLancamento: 1 },
      { fonte: "tmdb", fonteId: "353081", ordemLancamento: 2 },
      { fonte: "tmdb", fonteId: "458156", ordemLancamento: 3 },
      { fonte: "tmdb", fonteId: "603692", ordemLancamento: 4 },
    ],
  },
  {
    nome: "Batman (Trilogia Nolan)",
    slug: "batman-nolan",
    itens: [
      { fonte: "tmdb", fonteId: "27205", ordemLancamento: 1 },
      { fonte: "tmdb", fonteId: "49026", ordemLancamento: 2 },
      { fonte: "tmdb", fonteId: "49047", ordemLancamento: 3 },
    ],
  },
  {
    nome: "Jogos Vorazes",
    slug: "jogos-vorazes",
    itens: [
      { fonte: "tmdb", fonteId: "70160", ordemLancamento: 1 },
      { fonte: "tmdb", fonteId: "109445", ordemLancamento: 2 },
      { fonte: "tmdb", fonteId: "131631", ordemLancamento: 3 },
      { fonte: "tmdb", fonteId: "294254", ordemLancamento: 4 },
    ],
  },
  {
    nome: "Crepúsculo",
    slug: "crepusculo",
    itens: [
      { fonte: "tmdb", fonteId: "8966", ordemLancamento: 1 },
      { fonte: "tmdb", fonteId: "50620", ordemLancamento: 2 },
      { fonte: "tmdb", fonteId: "50619", ordemLancamento: 3 },
      { fonte: "tmdb", fonteId: "50646", ordemLancamento: 4 },
    ],
  },
  {
    nome: "Breaking Bad (Universo)",
    slug: "breaking-bad-universo",
    itens: [
      { fonte: "tmdb_tv", fonteId: "1396", ordemLancamento: 1, ordemCronologica: 1 },
      { fonte: "tmdb_tv", fonteId: "60059", ordemLancamento: 2, ordemCronologica: 2 },
    ],
  },
  {
    nome: "Game of Thrones (Universo)",
    slug: "game-of-thrones-universo",
    itens: [
      { fonte: "tmdb_tv", fonteId: "1399", ordemLancamento: 1, ordemCronologica: 1 },
      { fonte: "tmdb_tv", fonteId: "94997", ordemLancamento: 2, ordemCronologica: 2 },
    ],
  },
  {
    nome: "Planeta dos Macacos",
    slug: "planeta-dos-macacos",
    itens: [
      { fonte: "tmdb", fonteId: "947", ordemLancamento: 1, ordemCronologica: 1 },
      { fonte: "tmdb", fonteId: "1584", ordemLancamento: 2, ordemCronologica: 2 },
      { fonte: "tmdb", fonteId: "293660", ordemLancamento: 3, ordemCronologica: 3 },
      { fonte: "tmdb", fonteId: "346698", ordemLancamento: 4, ordemCronologica: 4 },
      { fonte: "tmdb", fonteId: "482321", ordemLancamento: 5, ordemCronologica: 5 },
    ],
  },
  {
    nome: "Mad Max",
    slug: "mad-max",
    itens: [
      { fonte: "tmdb", fonteId: "9659", ordemLancamento: 1 },
      { fonte: "tmdb", fonteId: "9350", ordemLancamento: 2 },
      { fonte: "tmdb", fonteId: "863", ordemLancamento: 3 },
      { fonte: "tmdb", fonteId: "76341", ordemLancamento: 4 },
      { fonte: "tmdb", fonteId: "438695", ordemLancamento: 5 },
    ],
  },
];

async function main(): Promise<void> {
  let vinculadas = 0;
  let franquiasCriadas = 0;
  for (const def of FRANQUIAS) {
    // Resolve as mídias existentes no catálogo.
    const midias: { id: string }[] = [];
    for (const item of def.itens) {
      const midia = await prisma.midia.findUnique({
        where: { fonte_fonte_id: { fonte: item.fonte, fonte_id: item.fonteId } },
        select: { id: true },
      });
      if (midia) midias.push(midia);
    }
    if (midias.length < 2) {
      console.log(
        `[seed:franquias] ${def.nome}: ${midias.length} título(s) no catálogo — ignorada.`,
      );
      continue;
    }
    const franquia = await prisma.franquia.upsert({
      where: { slug: def.slug },
      create: { nome: def.nome, slug: def.slug },
      update: { nome: def.nome },
    });
    franquiasCriadas++;
    for (const item of def.itens) {
      const midia = await prisma.midia.findUnique({
        where: { fonte_fonte_id: { fonte: item.fonte, fonte_id: item.fonteId } },
        select: { id: true },
      });
      if (!midia) continue;
      await prisma.midiaFranquia.upsert({
        where: {
          midia_id_franquia_id: { midia_id: midia.id, franquia_id: franquia.id },
        },
        create: {
          midia_id: midia.id,
          franquia_id: franquia.id,
          ordem_lancamento: item.ordemLancamento,
          ordem_cronologica: item.ordemCronologica ?? null,
        },
        update: {
          ordem_lancamento: item.ordemLancamento,
          ordem_cronologica: item.ordemCronologica ?? null,
        },
      });
      vinculadas++;
    }
    console.log(`[seed:franquias] ${def.nome}: ${midias.length} títulos vinculados.`);
  }
  console.log(`[seed:franquias] concluído: ${franquiasCriadas} franquias, ${vinculadas} vínculos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
