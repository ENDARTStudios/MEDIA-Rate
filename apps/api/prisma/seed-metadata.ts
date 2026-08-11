/* eslint-disable no-console */
// T287 (Addendum 2) — seed de contexto da obra: classificação por região,
// prêmios e origem editorial. STANDALONE (D-275): roda em prisma/ no
// container de produção. Ausência de chave/fonte = ausência graciosa
// (nunca erro). Upserts idempotentes por (midia, regiao) / (midia, nome).
//
// Uso: npm run db:seed:metadata

import { PrismaClient } from "@prisma/client";
import { consultarGames } from "./igdb-http.js";

const prisma = new PrismaClient();

const DELAY_MS = 300;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** IGDB age_rating.category → classificação BR (rating_enforcement? padrão). */
export const IGDB_IDADE_BR: Record<number, string> = {
  1: "L", // 3+
  2: "L", // 7+
  3: "DEZ", // 12+
  4: "CATORZE", // 16+
  5: "DEZOITO", // 18+
};

/** Severidade (menor → mais restritivo) para escolha conservadora. */
const SEVERIDADE_BR: Record<string, number> = {
  L: 0,
  DEZ: 1,
  DOZE: 2,
  CATORZE: 3,
  DEZESSEIS: 4,
  DEZOITO: 5,
};

/** T287 — mapeia o rating IGDB mais restritivo → classificação BR (export p/ teste). */
export function mapearIdadeIGDB(ages: { rating?: number; category?: number }[]): string | null {
  let maxBr: string | null = null;
  let maxSeveridade = -1;
  for (const a of ages) {
    if (a.category === undefined || a.category > 5) continue;
    const br = IGDB_IDADE_BR[a.category];
    const sev = br !== undefined ? SEVERIDADE_BR[br] : -1;
    if (br && sev > maxSeveridade) {
      maxBr = br;
      maxSeveridade = sev;
    }
  }
  return maxBr;
}

interface IgdbAgeRating {
  rating?: number;
  category?: number;
}

/** Curadoria editorial dos títulos-âncora (evidência pública de prêmios). */
export const CURADORIA: {
  slug: string;
  origem?: string;
  premios?: {
    nome: string;
    categoria: string;
    ano: number;
    venceu: boolean;
    organizacao: string;
  }[];
}[] = [
  {
    slug: "duna",
    origem: "LIVRO",
    premios: [
      {
        nome: "Oscar de Melhor Montagem",
        categoria: "Melhor Montagem",
        ano: 2022,
        venceu: true,
        organizacao: "Academy of Motion Picture Arts and Sciences",
      },
      {
        nome: "Oscar de Melhor Som",
        categoria: "Melhor Som",
        ano: 2022,
        venceu: true,
        organizacao: "Academy of Motion Picture Arts and Sciences",
      },
    ],
  },
  {
    slug: "elden-ring",
    origem: "ORIGINAL",
    premios: [
      {
        nome: "The Game Awards — Jogo do Ano",
        categoria: "Game of the Year",
        ano: 2022,
        venceu: true,
        organizacao: "The Game Awards",
      },
    ],
  },
  {
    slug: "the-witcher-3",
    origem: "ORIGINAL",
    premios: [
      {
        nome: "The Game Awards — Jogo do Ano",
        categoria: "Game of the Year",
        ano: 2015,
        venceu: true,
        organizacao: "The Game Awards",
      },
    ],
  },
  {
    slug: "watchmen",
    origem: "HQ",
  },
  {
    slug: "berserk",
    origem: "MANGA",
  },
];

async function origemGame(
  gameId: string,
): Promise<{ regiao: "BR"; valor: string; fonte: string } | null> {
  const rows = await consultarGames(
    `fields age_ratings.rating,age_ratings.category; where id = ${gameId}; limit 1;`,
  );
  const ages: IgdbAgeRating[] =
    (rows?.[0] as { age_ratings?: IgdbAgeRating[] } | undefined)?.age_ratings ?? [];
  // Prefere o rating mais restritivo disponível (decisão conservadora).
  const maxBr = mapearIdadeIGDB(ages);
  return maxBr ? { regiao: "BR", valor: maxBr, fonte: "IGDB" } : null;
}

async function main(): Promise<void> {
  let classificacoes = 0;
  let premios = 0;
  let origens = 0;

  // 1) Curadoria editorial (origem + prêmios) — sempre disponível.
  for (const c of CURADORIA) {
    const midias = await prisma.midia.findMany({
      where: {
        titulo: { contains: c.slug.split("-").join(" "), mode: "insensitive" },
        deleted_at: null,
      },
      take: 1,
      select: { id: true },
    });
    const midia = midias[0];
    if (!midia) continue;
    if (c.origem) {
      await prisma.midia.update({
        where: { id: midia.id },
        data: { origem_editorial: c.origem as never },
      });
      origens++;
    }
    for (const p of c.premios ?? []) {
      await prisma.premio.upsert({
        where: { id: `seed-${midia.id}-${p.nome}` },
        create: { id: `seed-${midia.id}-${p.nome}`, midia_id: midia.id, ...p },
        update: {},
      });
      premios++;
    }
  }

  // 2) GAMES — classificação IGDB (ausência graciosa sem creds).
  const games = await prisma.midia.findMany({
    where: { tipo: "GAME", deleted_at: null },
    select: { id: true, fonte_id: true },
  });
  for (const g of games) {
    const br = await origemGame(g.fonte_id);
    await delay(DELAY_MS);
    if (!br) continue;
    await prisma.classificacaoRegiao.upsert({
      where: { midia_id_regiao: { midia_id: g.id, regiao: "BR" } },
      create: { midia_id: g.id, regiao: "BR", valor: br.valor, fonte: br.fonte },
      update: { valor: br.valor },
    });
    classificacoes++;
  }

  console.log(
    `[seed:metadata] origens=${origens} premios=${premios} classificacoes_br=${classificacoes}`,
  );
  await prisma.$disconnect();
}

const isDirectRun =
  import.meta.url === new URL(process.argv[1] ?? "", "file:").href ||
  process.argv[1]?.endsWith("seed-metadata.ts");

if (isDirectRun) {
  main().catch((err) => {
    console.error("[seed:metadata] erro fatal:", String(err).slice(0, 300));
    process.exit(1);
  });
}
