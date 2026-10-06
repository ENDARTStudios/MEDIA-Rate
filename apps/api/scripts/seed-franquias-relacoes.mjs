#!/usr/bin/env node
/**
 * T163 (Onda B) — seed auditado de franquias e relações de obra.
 *
 * Dataset CURADO manualmente a partir do catálogo real (624 títulos ativos,
 * dump 2026-10-06). Matching por (titulo EXATO, tipo) — nada é criado por
 * inferência de nome; títulos ausentes/ambíguos vão para o relatório e são
 * PULADOS. Idempotente: upsert por slug (franquia), (midia, franquia) e
 * (origem, destino) — rodar de novo não duplica.
 *
 * Uso (a partir de apps/api):
 *   DRY_RUN=1 (default) → só planeja e imprime o relatório (read-only).
 *   DRY_RUN=0            → executa os upserts.
 */

export const FRANQUIAS = [
  {
    slug: "o-senhor-dos-aneis",
    nome: "O Senhor dos Anéis",
    itens: [
      { titulo: "O Hobbit", tipo: "LIVRO", lancamento: 1, cronologica: 1 },
      {
        titulo: "O Senhor dos Anéis: A Sociedade do Anel",
        tipo: "FILME",
        lancamento: 2,
        cronologica: 2,
      },
      {
        titulo: "O Senhor dos Anéis: As Duas Torres",
        tipo: "FILME",
        lancamento: 3,
        cronologica: 3,
      },
      {
        titulo: "O Senhor dos Anéis: O Retorno do Rei",
        tipo: "FILME",
        lancamento: 4,
        cronologica: 4,
      },
    ],
  },
  {
    slug: "star-wars",
    nome: "Star Wars",
    itens: [
      { titulo: "Star Wars: The Clone Wars", tipo: "SERIE", lancamento: 1, cronologica: 1 },
      {
        titulo: "Star Wars: Maul - Lorde das Sombras",
        tipo: "SERIE",
        lancamento: 2,
        cronologica: 2,
      },
      { titulo: "Guerra nas Estrelas", tipo: "FILME", lancamento: 3, cronologica: 3 },
      {
        titulo: "Guerra nas Estrelas: O Império Contra-Ataca",
        tipo: "FILME",
        lancamento: 4,
        cronologica: 4,
      },
    ],
  },
  {
    slug: "breaking-bad-universo",
    nome: "Breaking Bad (Universo)",
    itens: [
      { titulo: "Better Call Saul", tipo: "SERIE", lancamento: 2, cronologica: 1 },
      { titulo: "Breaking Bad", tipo: "SERIE", lancamento: 1, cronologica: 2 },
    ],
  },
  {
    slug: "demon-slayer",
    nome: "Demon Slayer",
    itens: [
      { titulo: "Demon Slayer: Kimetsu no Yaiba", tipo: "MANGA", lancamento: 1, cronologica: 1 },
      { titulo: "Demon Slayer: Kimetsu no Yaiba", tipo: "SERIE", lancamento: 2, cronologica: 2 },
      {
        titulo: "Demon Slayer: Mugen Train - O Filme",
        tipo: "FILME",
        lancamento: 3,
        cronologica: 3,
      },
      {
        titulo: "Demon Slayer: Kimetsu no Yaiba Castelo Infinito",
        tipo: "FILME",
        lancamento: 4,
        cronologica: 4,
      },
    ],
  },
  {
    slug: "jujutsu-kaisen",
    nome: "Jujutsu Kaisen",
    itens: [
      { titulo: "Jujutsu Kaisen 0: O Filme", tipo: "FILME", lancamento: 3, cronologica: 1 },
      { titulo: "Jujutsu Kaisen", tipo: "MANGA", lancamento: 1, cronologica: 2 },
      { titulo: "Jujutsu Kaisen", tipo: "SERIE", lancamento: 2, cronologica: 3 },
    ],
  },
  {
    slug: "violet-evergarden",
    nome: "Violet Evergarden",
    itens: [
      { titulo: "Violet Evergarden", tipo: "SERIE", lancamento: 1, cronologica: 1 },
      {
        titulo: "Violet Evergarden Gaiden: Eternidade e a Boneca de Automemória",
        tipo: "FILME",
        lancamento: 2,
        cronologica: 2,
      },
      { titulo: "Violet Evergarden: O Filme", tipo: "FILME", lancamento: 3, cronologica: 3 },
    ],
  },
  {
    slug: "homem-aranha",
    nome: "Homem-Aranha",
    itens: [
      { titulo: "Homem-Aranha: Azul", tipo: "COMIC", lancamento: 1, cronologica: null },
      { titulo: "O Espetacular Homem-Aranha", tipo: "SERIE", lancamento: 2, cronologica: null },
      { titulo: "Homem-Aranha: No Aranhaverso", tipo: "FILME", lancamento: 3, cronologica: 1 },
      {
        titulo: "Homem-Aranha: Através do Aranhaverso",
        tipo: "FILME",
        lancamento: 4,
        cronologica: 2,
      },
      { titulo: "Marvel's Spider-Man 2", tipo: "GAME", lancamento: 5, cronologica: null },
    ],
  },
  {
    slug: "naruto",
    nome: "Naruto",
    itens: [
      { titulo: "Naruto", tipo: "MANGA", lancamento: 1, cronologica: 1 },
      { titulo: "Naruto Shippuden", tipo: "SERIE", lancamento: 2, cronologica: 2 },
    ],
  },
  {
    slug: "one-piece",
    nome: "One Piece",
    itens: [
      { titulo: "One Piece", tipo: "MANGA", lancamento: 1, cronologica: 1 },
      { titulo: "One Piece", tipo: "SERIE", lancamento: 2, cronologica: 2 },
    ],
  },
  {
    slug: "attack-on-titan",
    nome: "Attack on Titan",
    itens: [
      { titulo: "Attack on Titan", tipo: "MANGA", lancamento: 1, cronologica: 1 },
      { titulo: "Attack on Titan", tipo: "SERIE", lancamento: 2, cronologica: 2 },
    ],
  },
  {
    slug: "berserk",
    nome: "Berserk",
    itens: [
      { titulo: "Berserk", tipo: "MANGA", lancamento: 1, cronologica: 1 },
      { titulo: "Berserk", tipo: "SERIE", lancamento: 2, cronologica: 2 },
    ],
  },
  {
    slug: "death-note",
    nome: "Death Note",
    itens: [
      { titulo: "Death Note", tipo: "MANGA", lancamento: 1, cronologica: 1 },
      { titulo: "Death Note", tipo: "SERIE", lancamento: 2, cronologica: 2 },
    ],
  },
  {
    slug: "chainsaw-man",
    nome: "Chainsaw Man",
    itens: [
      { titulo: "Chainsaw Man", tipo: "MANGA", lancamento: 1, cronologica: 1 },
      { titulo: "Chainsaw Man", tipo: "SERIE", lancamento: 2, cronologica: 2 },
      {
        titulo: "Chainsaw Man – O Filme: Arco da Reze",
        tipo: "FILME",
        lancamento: 3,
        cronologica: 3,
      },
    ],
  },
  {
    slug: "duna",
    nome: "Duna",
    itens: [
      { titulo: "Duna", tipo: "LIVRO", lancamento: 1, cronologica: 1 },
      { titulo: "Duna: Parte Dois", tipo: "FILME", lancamento: 2, cronologica: 2 },
    ],
  },
  {
    slug: "harry-potter",
    nome: "Harry Potter",
    itens: [
      { titulo: "Harry Potter e a Pedra Filosofal", tipo: "LIVRO", lancamento: 1, cronologica: 1 },
      {
        titulo: "Harry Potter e as Relíquias da Morte - Parte 2",
        tipo: "FILME",
        lancamento: 2,
        cronologica: 2,
      },
    ],
  },
  {
    slug: "batman",
    nome: "Batman",
    itens: [
      { titulo: "Batman: O Cavaleiro das Trevas", tipo: "COMIC", lancamento: 1, cronologica: null },
      { titulo: "Batman: A Piada Mortal", tipo: "COMIC", lancamento: 2, cronologica: null },
      { titulo: "Batman: A Série Animada", tipo: "SERIE", lancamento: 3, cronologica: null },
      { titulo: "Batman: O Cavaleiro das Trevas", tipo: "FILME", lancamento: 4, cronologica: null },
    ],
  },
  {
    slug: "universo-cinematografico-marvel",
    nome: "Universo Cinematográfico Marvel",
    itens: [
      { titulo: "Vingadores: Guerra Infinita", tipo: "FILME", lancamento: 1, cronologica: 1 },
      { titulo: "Vingadores: Ultimato", tipo: "FILME", lancamento: 2, cronologica: 2 },
    ],
  },
  {
    slug: "the-last-of-us",
    nome: "The Last of Us",
    itens: [
      { titulo: "The Last of Us", tipo: "SERIE", lancamento: 2, cronologica: 1 },
      { titulo: "The Last of Us Part II", tipo: "GAME", lancamento: 1, cronologica: 2 },
    ],
  },
];

export const RELACOES = [
  {
    origem: { titulo: "Demon Slayer: Kimetsu no Yaiba", tipo: "SERIE" },
    tipoRelacao: "ADAPTACAO_DE",
    destino: { titulo: "Demon Slayer: Kimetsu no Yaiba", tipo: "MANGA" },
    nota: "Adapta os arcos iniciais do mangá",
  },
  {
    origem: { titulo: "Demon Slayer: Mugen Train - O Filme", tipo: "FILME" },
    tipoRelacao: "SEQUENCIA_DE",
    destino: { titulo: "Demon Slayer: Kimetsu no Yaiba", tipo: "SERIE" },
    nota: "Continua direto da 1ª temporada",
  },
  {
    origem: { titulo: "Demon Slayer: Kimetsu no Yaiba Castelo Infinito", tipo: "FILME" },
    tipoRelacao: "SEQUENCIA_DE",
    destino: { titulo: "Demon Slayer: Mugen Train - O Filme", tipo: "FILME" },
    nota: "Segue para o arco final do mangá",
  },
  {
    origem: { titulo: "Jujutsu Kaisen", tipo: "SERIE" },
    tipoRelacao: "ADAPTACAO_DE",
    destino: { titulo: "Jujutsu Kaisen", tipo: "MANGA" },
    nota: null,
  },
  {
    origem: { titulo: "Jujutsu Kaisen 0: O Filme", tipo: "FILME" },
    tipoRelacao: "PREQUELA_DE",
    destino: { titulo: "Jujutsu Kaisen", tipo: "SERIE" },
    nota: "História anterior à 1ª temporada",
  },
  {
    origem: {
      titulo: "Violet Evergarden Gaiden: Eternidade e a Boneca de Automemória",
      tipo: "FILME",
    },
    tipoRelacao: "SEQUENCIA_DE",
    destino: { titulo: "Violet Evergarden", tipo: "SERIE" },
    nota: null,
  },
  {
    origem: { titulo: "Violet Evergarden: O Filme", tipo: "FILME" },
    tipoRelacao: "SEQUENCIA_DE",
    destino: { titulo: "Violet Evergarden", tipo: "SERIE" },
    nota: "Conclui a história da série",
  },
  {
    origem: { titulo: "Homem-Aranha: Através do Aranhaverso", tipo: "FILME" },
    tipoRelacao: "SEQUENCIA_DE",
    destino: { titulo: "Homem-Aranha: No Aranhaverso", tipo: "FILME" },
    nota: null,
  },
  {
    origem: { titulo: "Naruto Shippuden", tipo: "SERIE" },
    tipoRelacao: "ADAPTACAO_DE",
    destino: { titulo: "Naruto", tipo: "MANGA" },
    nota: "Adapta os arcos finais do mangá",
  },
  {
    origem: { titulo: "One Piece", tipo: "SERIE" },
    tipoRelacao: "ADAPTACAO_DE",
    destino: { titulo: "One Piece", tipo: "MANGA" },
    nota: null,
  },
  {
    origem: { titulo: "Attack on Titan", tipo: "SERIE" },
    tipoRelacao: "ADAPTACAO_DE",
    destino: { titulo: "Attack on Titan", tipo: "MANGA" },
    nota: null,
  },
  {
    origem: { titulo: "Berserk", tipo: "SERIE" },
    tipoRelacao: "ADAPTACAO_DE",
    destino: { titulo: "Berserk", tipo: "MANGA" },
    nota: "Adapta o arco da Idade do Ouro",
  },
  {
    origem: { titulo: "Death Note", tipo: "SERIE" },
    tipoRelacao: "ADAPTACAO_DE",
    destino: { titulo: "Death Note", tipo: "MANGA" },
    nota: null,
  },
  {
    origem: { titulo: "Chainsaw Man", tipo: "SERIE" },
    tipoRelacao: "ADAPTACAO_DE",
    destino: { titulo: "Chainsaw Man", tipo: "MANGA" },
    nota: null,
  },
  {
    origem: { titulo: "Chainsaw Man – O Filme: Arco da Reze", tipo: "FILME" },
    tipoRelacao: "SEQUENCIA_DE",
    destino: { titulo: "Chainsaw Man", tipo: "SERIE" },
    nota: "Adapta o arco seguinte ao da 1ª temporada",
  },
  {
    origem: { titulo: "O Senhor dos Anéis: A Sociedade do Anel", tipo: "FILME" },
    tipoRelacao: "ADAPTACAO_DE",
    destino: { titulo: "O Senhor dos Anéis: A Sociedade do Anel", tipo: "LIVRO" },
    nota: "Adaptação do primeiro volume",
  },
  {
    origem: { titulo: "Vingadores: Ultimato", tipo: "FILME" },
    tipoRelacao: "SEQUENCIA_DE",
    destino: { titulo: "Vingadores: Guerra Infinita", tipo: "FILME" },
    nota: null,
  },
  {
    origem: { titulo: "Guerra nas Estrelas: O Império Contra-Ataca", tipo: "FILME" },
    tipoRelacao: "SEQUENCIA_DE",
    destino: { titulo: "Guerra nas Estrelas", tipo: "FILME" },
    nota: "Episódio V",
  },
  {
    origem: { titulo: "The Last of Us", tipo: "SERIE" },
    tipoRelacao: "MESMO_UNIVERSO",
    destino: { titulo: "The Last of Us Part II", tipo: "GAME" },
    nota: "A série adapta o primeiro jogo (não catalogado); Parte II continua a história",
  },
];

/**
 * Puro (testável): casa o dataset com as linhas do catálogo e monta o plano.
 * - match por (titulo EXATO, tipo); 0 → ausentes, >1 → ambiguos (pulados).
 */
export function construirPlano(dataset, midias) {
  const indice = new Map();
  for (const m of midias) {
    const chave = `${m.titulo}::${m.tipo}`;
    if (indice.has(chave)) indice.get(chave).push(m);
    else indice.set(chave, [m]);
  }
  const resolver = (ref) => {
    const hits = indice.get(`${ref.titulo}::${ref.tipo}`) ?? [];
    if (hits.length === 1) return { ok: true, id: hits[0].id };
    return { ok: false, motivo: hits.length === 0 ? "ausente" : "ambiguo" };
  };

  const ausentes = [];
  const ambiguos = [];
  const franquias = [];
  for (const f of dataset.franquias) {
    const itens = [];
    for (const it of f.itens) {
      const r = resolver(it);
      if (!r.ok) {
        (r.motivo === "ausente" ? ausentes : ambiguos).push({
          contexto: `franquia ${f.slug}`,
          titulo: it.titulo,
          tipo: it.tipo,
        });
        continue;
      }
      itens.push({ midiaId: r.id, lancamento: it.lancamento, cronologica: it.cronologica });
    }
    // Franquia só entra com >= 2 itens resolvidos (regra do hub /top).
    if (itens.length >= 2) franquias.push({ slug: f.slug, nome: f.nome, itens });
    else if (itens.length > 0)
      ausentes.push({
        contexto: `franquia ${f.slug} (ficou com < 2 itens)`,
        titulo: f.nome,
        tipo: "-",
      });
  }

  const relacoes = [];
  for (const r of dataset.relacoes) {
    const o = resolver(r.origem);
    const d = resolver(r.destino);
    if (!o.ok || !d.ok) {
      ((!o.ok ? o.motivo : d.motivo) === "ausente" ? ausentes : ambiguos).push({
        contexto: `relação ${r.tipoRelacao}`,
        titulo: r.origem.titulo,
        tipo: r.origem.tipo,
      });
      continue;
    }
    relacoes.push({
      origemId: o.id,
      destinoId: d.id,
      tipoRelacao: r.tipoRelacao,
      nota: r.nota,
    });
  }

  return { franquias, relacoes, ausentes, ambiguos };
}

async function executar(plano, prisma) {
  let franquiasCriadas = 0;
  let vinculos = 0;
  let relacoes = 0;
  for (const f of plano.franquias) {
    const franquia = await prisma.franquia.upsert({
      where: { slug: f.slug },
      create: { slug: f.slug, nome: f.nome },
      update: { nome: f.nome },
    });
    franquiasCriadas += 1;
    for (const it of f.itens) {
      await prisma.midiaFranquia.upsert({
        where: { midia_id_franquia_id: { midia_id: it.midiaId, franquia_id: franquia.id } },
        create: {
          midia_id: it.midiaId,
          franquia_id: franquia.id,
          ordem_lancamento: it.lancamento,
          ordem_cronologica: it.cronologica,
        },
        update: {
          ordem_lancamento: it.lancamento,
          ordem_cronologica: it.cronologica,
        },
      });
      vinculos += 1;
    }
  }
  for (const r of plano.relacoes) {
    await prisma.relacaoObra.upsert({
      where: { origem_id_destino_id: { origem_id: r.origemId, destino_id: r.destinoId } },
      create: {
        origem_id: r.origemId,
        destino_id: r.destinoId,
        tipo: r.tipoRelacao,
        nota_editorial: r.nota,
      },
      update: { tipo: r.tipoRelacao, nota_editorial: r.nota },
    });
    relacoes += 1;
  }
  return { franquiasCriadas, vinculos, relacoes };
}

async function main() {
  const dryRun = process.env.DRY_RUN !== "0";
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const midias = await prisma.midia.findMany({
      where: { deleted_at: null },
      select: { id: true, titulo: true, tipo: true },
    });
    const plano = construirPlano({ franquias: FRANQUIAS, relacoes: RELACOES }, midias);
    console.log(
      `PLANO: ${plano.franquias.length} franquias (${plano.franquias.reduce((a, f) => a + f.itens.length, 0)} vínculos), ${plano.relacoes.length} relações`,
    );
    if (plano.ausentes.length) {
      console.log(`AUSENTES (${plano.ausentes.length}):`);
      for (const a of plano.ausentes) console.log(`  - [${a.tipo}] ${a.titulo} (${a.contexto})`);
    }
    if (plano.ambiguos.length) {
      console.log(`AMBIGUOS (${plano.ambiguos.length}):`);
      for (const a of plano.ambiguos) console.log(`  - [${a.tipo}] ${a.titulo} (${a.contexto})`);
    }
    if (dryRun) {
      console.log("DRY_RUN — nada foi escrito. Execute com DRY_RUN=0 para aplicar.");
    } else {
      const res = await executar(plano, prisma);
      console.log(
        `APLICADO: ${res.franquiasCriadas} franquias, ${res.vinculos} vínculos, ${res.relacoes} relações.`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Executa só como script (spec importa construirPlano).
const isMain =
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href;
if (isMain) {
  main().catch((e) => {
    console.error("ERRO:", e.message);
    process.exit(1);
  });
}
