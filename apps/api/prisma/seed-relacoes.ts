/**
 * seed-relacoes.ts (T198, Addendum 3 Parte 2) — popula o grafo RelacaoObra:
 *  (1) Wikidata SPARQL P144 (top 100 obras mais bem avaliadas do catálogo);
 *  (2) curadoria manual para as obras canônicas (Duna/Matrix/Watchmen/
 *      Berserk/Odisseia/1984/Irmãos Karamazov).
 *
 * Idempotente: upsert por (origem_id, destino_id). Arestas só são criadas
 * quando AMBOS os extremos existem no catálogo (fallback curado).
 *
 * Uso: cd apps/api && npm run db:seed:relacoes
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { buscarArestasWikidata } from "./seed-lib.js";

interface CuradoriaItem {
  origemTitulo: string;
  destinoTitulo: string;
  tipo: "ADAPTACAO_DE" | "SEQUENCIA_DE" | "PREQUELA_DE" | "SPINOFF_DE" | "MESMO_UNIVERSO";
  notaEditorial?: string;
}

/** Curadoria manual — reforço de qualidade sobre a base Wikidata (D-212). */
const CURADORIA: CuradoriaItem[] = [
  { origemTitulo: "Dune", destinoTitulo: "Duna", tipo: "ADAPTACAO_DE", notaEditorial: "Baseado no livro de Frank Herbert" },
  { origemTitulo: "Dune: Part Two", destinoTitulo: "Duna", tipo: "ADAPTACAO_DE", notaEditorial: "Baseado no livro de Frank Herbert" },
  { origemTitulo: "Watchmen", destinoTitulo: "Watchmen", tipo: "ADAPTACAO_DE", notaEditorial: "Adaptação da graphic novel de Alan Moore" },
  { origemTitulo: "Berserk", destinoTitulo: "Berserk", tipo: "ADAPTACAO_DE", notaEditorial: "Adaptação do mangá de Kentaro Miura" },
  { origemTitulo: "1984", destinoTitulo: "1984", tipo: "ADAPTACAO_DE", notaEditorial: "Baseado no romance de George Orwell" },
  { origemTitulo: "The Matrix", destinoTitulo: "The Matrix", tipo: "MESMO_UNIVERSO", notaEditorial: "Franquia multiplataforma" },
  { origemTitulo: "A Odisseia", destinoTitulo: "A Odisseia", tipo: "ADAPTACAO_DE", notaEditorial: "Baseado no poema épico de Homero" },
  { origemTitulo: "Os Irmãos Karamazov", destinoTitulo: "Os Irmãos Karamazov", tipo: "ADAPTACAO_DE", notaEditorial: "Baseado no romance de Dostoiévski" },
  { origemTitulo: "The Boys", destinoTitulo: "The Boys", tipo: "ADAPTACAO_DE", notaEditorial: "Adaptação da HQ de Garth Ennis" },
  { origemTitulo: "Better Call Saul", destinoTitulo: "Breaking Bad", tipo: "SPINOFF_DE", notaEditorial: "Spin-off de Breaking Bad" },
  { origemTitulo: "The Lord of the Rings", destinoTitulo: "The Lord of the Rings", tipo: "ADAPTACAO_DE", notaEditorial: "Baseado na obra de J.R.R. Tolkien" },
];

/**
 * Classificação de gêneros (Addendum 2 Parte 4): NARRATIVO = compartilhado
 * cross-mídia (filtro /catalog?genero= retorna qualquer tipo); SUBGENERO =
 * específico de mídia (filtro restringe a midia_alvo).
 */
const NARRATIVOS = [
  "acao", "aventura", "comedia", "drama", "terror", "ficcao-cientifica",
  "fantasia", "romance", "misterio", "crime", "documentario", "animacao",
  "familia", "guerra", "historia", "musica", "faroeste", "thriller",
  "acao-e-aventura", "ficcao-cientifica-e-fantasia", "guerra-e-politica",
  "reality-show", "novela", "talk-show", "noticias", "infantil",
  "esporte", "cyberpunk", "super-herói", "super-heroi",
];

const SUBGENEROS: Record<string, "GAME" | "ANIME" | "COMIC"> = {
  rpg: "GAME",
  moba: "GAME",
  fps: "GAME",
  "battle-royale": "GAME",
  roguelike: "GAME",
  metroidvania: "GAME",
  "luta": "GAME",
  puzzle: "GAME",
  simulacao: "GAME",
  estrategia: "GAME",
  sandbox: "GAME",
  shonen: "ANIME",
  "seinen": "ANIME",
  isekai: "ANIME",
  "acao-aventura-games": "GAME",
};

async function classificarGeneros(prisma: PrismaClient): Promise<void> {
  const generos = await prisma.genero.findMany({ select: { id: true, slug: true, tipo: true } });
  let atualizados = 0;
  for (const g of generos) {
    if (NARRATIVOS.includes(g.slug)) {
      if (g.tipo !== "NARRATIVO") {
        await prisma.genero.update({ where: { id: g.id }, data: { tipo: "NARRATIVO", midia_alvo: null } });
        atualizados++;
      }
      continue;
    }
    const alvo = SUBGENEROS[g.slug];
    if (alvo) {
      if (g.tipo !== "SUBGENERO" || g.midia_alvo !== alvo) {
        await prisma.genero.update({ where: { id: g.id }, data: { tipo: "SUBGENERO", midia_alvo: alvo } });
        atualizados++;
      }
    }
  }
  console.log(`[seed:relacoes] ${atualizados} gêneros classificados (${NARRATIVOS.length} narrativos / ${Object.keys(SUBGENEROS).length} subgêneros).`);
}

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  console.log("[seed:relacoes] Conectado ao banco.");

  try {
    // 1) Wikidata — top 100 por score (score denormalizado).
    const top = await prisma.midia.findMany({
      orderBy: [{ score: "desc" }, { titulo: "asc" }],
      take: 100,
      select: { id: true, titulo: true },
    });
    console.log(`[seed:relacoes] Wikidata P144 sobre top ${top.length} do catálogo...`);
    const arestasWikidata = await buscarArestasWikidata(top);
    console.log(`[seed:relacoes] ${arestasWikidata.length} arestas inferidas via Wikidata.`);

    let criadas = 0;
    for (const a of arestasWikidata) {
      await prisma.relacaoObra.upsert({
        where: { origem_id_destino_id: { origem_id: a.origemId, destino_id: a.destinoId } },
        create: { origem_id: a.origemId, destino_id: a.destinoId, tipo: a.tipo },
        update: {},
      });
      criadas++;
    }

    // 2) Curadoria manual — resolve por título no catálogo (fallback seguro).
    const todas = await prisma.midia.findMany({ select: { id: true, titulo: true, tipo: true } });
    const porSlug = new Map<string, { id: string; titulo: string; tipo: string }>();
    for (const m of todas) {
      const s = slugify(m.titulo);
      if (!porSlug.has(s)) porSlug.set(s, m);
    }

    for (const c of CURADORIA) {
      const origem = porSlug.get(slugify(c.origemTitulo));
      const destino = porSlug.get(slugify(c.destinoTitulo));
      if (!origem || !destino) {
        console.warn(
          `[seed:relacoes] curadoria ignorada (título ausente no catálogo): "${c.origemTitulo}" → "${c.destinoTitulo}"`,
        );
        continue;
      }
      if (origem.id === destino.id) continue;
      await prisma.relacaoObra.upsert({
        where: { origem_id_destino_id: { origem_id: origem.id, destino_id: destino.id } },
        create: {
          origem_id: origem.id,
          destino_id: destino.id,
          tipo: c.tipo,
          nota_editorial: c.notaEditorial,
        },
        update: { tipo: c.tipo, nota_editorial: c.notaEditorial },
      });
      criadas++;
      console.log(`[seed:relacoes] curada: "${c.origemTitulo}" (${origem.tipo}) → "${c.destinoTitulo}" (${destino.tipo}) [${c.tipo}]`);
    }

    console.log(`[seed:relacoes] ${criadas} arestas no grafo RelacaoObra.`);

    // 3) Classificação de gêneros (narrativo vs subgênero com midia_alvo).
    await classificarGeneros(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun =
  import.meta.url === new URL(process.argv[1] ?? "", "file:").href ||
  process.argv[1]?.endsWith("seed-relacoes.ts");

if (isDirectRun) {
  main().catch((err) => {
    console.error("[seed:relacoes] Erro:", err);
    process.exit(1);
  });
}
