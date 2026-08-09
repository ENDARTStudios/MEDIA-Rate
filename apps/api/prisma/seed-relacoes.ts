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
  /** Título de fallback (usado apenas quando os ids não resolvem). */
  origemTitulo?: string;
  destinoTitulo?: string;
  /** IDENTIDADE (D-227): resolução preferencial por (fonte, fonte_id). */
  origemFonte?: string;
  origemFonteId?: string;
  destinoFonte?: string;
  destinoFonteId?: string;
  tipo: "ADAPTACAO_DE" | "SEQUENCIA_DE" | "PREQUELA_DE" | "SPINOFF_DE" | "MESMO_UNIVERSO";
  notaEditorial?: string;
}

/**
 * Curadoria manual — reforço de qualidade sobre a base Wikidata (D-212).
 *
 * D-227: resolução por IDENTIDADE (fonte, fonte_id) — os ids são os que os
 * próprios seeds criam (seed-tmdb: "tmdb"/"tmdb_tv" + id numérico da API;
 * seed-novas-midias: primeira fonte curada + slug). O título é APENAS
 * fallback para pares sem ids, porque o catálogo usa títulos localizados
 * pt-BR ("Duna") enquanto a curadoria conhece os nomes originais ("Dune").
 */
const CURADORIA: CuradoriaItem[] = [
  {
    origemFonte: "tmdb", origemFonteId: "438631", // Dune (2021)
    destinoFonte: "openlibrary", destinoFonteId: "duna", // livro Duna
    tipo: "ADAPTACAO_DE", notaEditorial: "Baseado no livro de Frank Herbert",
  },
  {
    origemFonte: "tmdb", origemFonteId: "693134", // Dune: Part Two (2024)
    destinoFonte: "openlibrary", destinoFonteId: "duna", // livro Duna
    tipo: "ADAPTACAO_DE", notaEditorial: "Baseado no livro de Frank Herbert",
  },
  {
    origemFonte: "tmdb", origemFonteId: "13183", // Watchmen (2009)
    destinoFonte: "comicvine", destinoFonteId: "watchmen", // HQ Watchmen
    tipo: "ADAPTACAO_DE", notaEditorial: "Adaptação da graphic novel de Alan Moore",
  },
  {
    origemFonte: "jikan", origemFonteId: "berserk", // mangá Berserk (ANIME)
    destinoFonte: "tmdb_tv", destinoFonteId: "2509", // série Berserk (1997)
    tipo: "ADAPTACAO_DE", notaEditorial: "Adaptação do mangá de Kentaro Miura",
  },
  {
    origemFonte: "tmdb_tv", origemFonteId: "82856", // Better Call Saul
    destinoFonte: "tmdb_tv", destinoFonteId: "1396", // Breaking Bad
    tipo: "SPINOFF_DE", notaEditorial: "Spin-off de Breaking Bad",
  },
  {
    origemFonte: "tmdb", origemFonteId: "603", // The Matrix (1999)
    destinoFonte: "tmdb", destinoFonteId: "604", // The Matrix Reloaded
    tipo: "SEQUENCIA_DE", notaEditorial: "Sequência de The Matrix",
  },
  {
    origemFonte: "tmdb", origemFonteId: "604", // The Matrix Reloaded
    destinoFonte: "tmdb", destinoFonteId: "605", // The Matrix Revolutions
    tipo: "SEQUENCIA_DE", notaEditorial: "Sequência de Reloaded",
  },
  {
    origemFonte: "tmdb", origemFonteId: "438631", // Dune (2021)
    destinoFonte: "tmdb", destinoFonteId: "693134", // Dune: Part Two
    tipo: "SEQUENCIA_DE", notaEditorial: "Sequência de Dune",
  },
  // Pares sem ids confiáveis — resolvem por título normalizado (fallback).
  { origemTitulo: "The Matrix", destinoTitulo: "The Matrix", tipo: "MESMO_UNIVERSO", notaEditorial: "Franquia multiplataforma" },
  { origemTitulo: "A Odisseia", destinoTitulo: "A Odisseia", tipo: "ADAPTACAO_DE", notaEditorial: "Baseado no poema épico de Homero" },
  { origemTitulo: "Os Irmãos Karamazov", destinoTitulo: "Os Irmãos Karamazov", tipo: "ADAPTACAO_DE", notaEditorial: "Baseado no romance de Dostoiévski" },
  { origemTitulo: "The Boys", destinoTitulo: "The Boys", tipo: "ADAPTACAO_DE", notaEditorial: "Adaptação da HQ de Garth Ennis" },
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

const SUBGENEROS: Record<string, "GAME" | "ANIME" | "MANGA" | "COMIC"> = {
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
  // D-233/T231: Shonen/Seinen/Isekai são gêneros de mangá (quadrinho
  // japonês) → MANGA; animação japonesa classifica como SERIE.
  shonen: "MANGA",
  "seinen": "MANGA",
  isekai: "MANGA",
  "acao-aventura-games": "GAME",
};

async function classificarGeneros(prisma: PrismaClient): Promise<void> {
  const generos = await prisma.genero.findMany({ select: { id: true, slug: true, tipo: true, midia_alvo: true } });
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

interface CatalogoMidia {
  id: string;
  titulo: string;
  titulo_original: string | null;
  fonte: string;
  fonte_id: string;
  tipo: string;
}

/**
 * Resolve um lado da curadoria (D-227): IDENTIDADE (fonte, fonte_id)
 * primeiro; título normalizado (titulo, titulo_original e slug) como
 * fallback. Nunca lança — retorna null e o chamador loga o unmatched.
 */
function resolverLado(
  catalogo: CatalogoMidia[],
  porFonte: Map<string, CatalogoMidia>,
  porSlug: Map<string, CatalogoMidia[]>,
  fonte?: string,
  fonteId?: string,
  titulo?: string,
): CatalogoMidia | null {
  if (fonte && fonteId) {
    const porIdentidade = porFonte.get(`${fonte}|${fonteId}`);
    if (porIdentidade) return porIdentidade;
  }
  if (titulo) {
    const slug = slugify(titulo);
    const candidatos = porSlug.get(slug);
    if (candidatos && candidatos.length === 1) return candidatos[0]!;
    if (candidatos && candidatos.length > 1) {
      // Ambíguo (ex.: filme e série com o mesmo título) — sem identidade
      // não dá para decidir; retorna null para logar unmatched.
      return null;
    }
  }
  return null;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  console.log("[seed:relacoes] Conectado ao banco.");

  try {
    // 1) Wikidata — top 100 por score (score denormalizado).
    const top = await prisma.midia.findMany({
      orderBy: [{ score: "desc" }, { titulo: "asc" }],
      take: 100,
      select: { id: true, titulo: true, titulo_original: true },
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

    // 2) Curadoria manual — resolve por IDENTIDADE (fonte, fonte_id) com
    // fallback por título normalizado (D-227).
    const todas = await prisma.midia.findMany({
      select: { id: true, titulo: true, titulo_original: true, fonte: true, fonte_id: true, tipo: true },
    });
    const porFonte = new Map<string, CatalogoMidia>();
    const porSlug = new Map<string, CatalogoMidia[]>();
    for (const m of todas) {
      porFonte.set(`${m.fonte}|${m.fonte_id}`, m);
      for (const t of [m.titulo, m.titulo_original]) {
        if (!t) continue;
        const s = slugify(t);
        const lista = porSlug.get(s) ?? [];
        lista.push(m);
        porSlug.set(s, lista);
      }
    }

    for (const c of CURADORIA) {
      const origem = resolverLado(todas, porFonte, porSlug, c.origemFonte, c.origemFonteId, c.origemTitulo);
      const destino = resolverLado(todas, porFonte, porSlug, c.destinoFonte, c.destinoFonteId, c.destinoTitulo);
      if (!origem || !destino) {
        console.warn(
          `[seed:relacoes] curadoria ignorada (lado ausente/ambíguo no catálogo): origem=${c.origemFonte ? `${c.origemFonte}/${c.origemFonteId}` : `"${c.origemTitulo}"`} → destino=${c.destinoFonte ? `${c.destinoFonte}/${c.destinoFonteId}` : `"${c.destinoTitulo}"`}`,
        );
        continue;
      }
      if (origem.id === destino.id) {
        console.warn(
          `[seed:relacoes] curadoria ignorada (origem e destino são a mesma mídia): "${origem.titulo}" (${origem.id})`,
        );
        continue;
      }
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
      console.log(
        `[seed:relacoes] curada: "${origem.titulo}" (${origem.tipo}) → "${destino.titulo}" (${destino.tipo}) [${c.tipo}]`,
      );
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
