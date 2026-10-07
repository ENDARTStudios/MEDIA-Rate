#!/usr/bin/env node
/**
 * T171 (Onda D2) — games em escala via IGDB: top por total_rating_count
 * (>= 10 avaliações e nota >= 50), com summary/cover/rating na própria
 * listagem (limit 500/página, 4 req/s). Escreve mídia + media_score
 * (IGDB público, escala nativa 0-100 do game) + avaliacao_fonte
 * (fonte "igdb_publico"). Existentes pulados; DRY_RUN default.
 */
import { request as httpsRequest } from "node:https";

const UA = "MEDIA-Rate/0.1 (beta; catalogo; mediarate.app)";
const IGDB = "https://api.igdb.com/v4";
const PAUSA_MS = 300; // 4 req/s
const PAGINAS = 10; // 10 × 500 = 5.000 jogos

function postar(url, corpo, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      { method: "POST", headers: { "User-Agent": UA, ...headers } },
      (res) => {
        let dados = "";
        res.on("data", (c) => (dados += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(dados));
          } catch {
            reject(new Error(`JSON inválido (${res.statusCode})`));
          }
        });
      },
    );
    req.setTimeout(30000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end(corpo);
  });
}

const esperar = (ms) =>
  new Promise((r) => {
    import("node:timers").then(({ setTimeout: t }) => t(r, ms));
  });

/** Slug canônico (mesma regra do D1). */
export function slugify(titulo) {
  return String(titulo ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 240);
}

/** Cover IGDB vem "//images.igdb.com/..." — normaliza para https. */
export function mapearJogo(g) {
  const nota = Number(g.total_rating ?? 0);
  const ano = g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null;
  return {
    fonte: "igdb",
    fonte_id: String(g.id),
    titulo: g.name ?? "",
    sinopse: g.summary && g.summary.trim() ? g.summary.trim() : null,
    ano_lancamento: Number.isFinite(ano) ? ano : null,
    imagem_url: g.cover?.url ? `https:${g.cover.url}` : null,
    score: nota > 0 ? Math.min(100, Math.round(nota * 10) / 10) : null,
    votos: Number.isFinite(g.total_rating_count) ? g.total_rating_count : 0,
  };
}

/** Slugs únicos (mesma semântica do D1 — Set mutado). */
export function resolverSlugs(candidatos, ocupadosSet) {
  const ocupados = ocupadosSet instanceof Set ? ocupadosSet : new Set(ocupadosSet);
  const saida = [];
  for (const c of candidatos) {
    const base = slugify(c.titulo) || c.fonte_id;
    let slug = base;
    if (ocupados.has(slug)) {
      slug = `${base}-game`;
      let n = 2;
      while (ocupados.has(slug)) {
        slug = `${base}-game-${n}`;
        n++;
      }
    }
    ocupados.add(slug);
    saida.push({ ...c, slug });
  }
  return saida;
}

function saida(msg) {
  process.stdout.write(`${msg}\n`);
}

async function main() {
  const dryRun = process.env.DRY_RUN !== "0";
  if (!process.env.IGDB_CLIENT_ID) {
    saida("ERRO: IGDB_CLIENT_ID ausente.");
    process.exitCode = 1;
    return;
  }
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const token = (
      await postar(
        `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
        "",
      )
    ).access_token;
    const headers = {
      "Client-ID": process.env.IGDB_CLIENT_ID,
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    };

    const existentes = new Set(
      (
        await prisma.midia.findMany({
          where: { fonte: "igdb" },
          select: { fonte_id: true },
        })
      ).map((m) => m.fonte_id),
    );
    const slugsOcupados = new Set(
      (await prisma.midia.findMany({ select: { slug: true } })).map((m) => m.slug).filter(Boolean),
    );

    let importados = 0;
    let pulados = 0;
    let falhas = 0;
    for (let pag = 0; pag < PAGINAS; pag++) {
      await esperar(PAUSA_MS);
      const jogos = await postar(
        `${IGDB}/games`,
        `fields name,summary,first_release_date,total_rating,total_rating_count,cover.url; where total_rating_count >= 10 & total_rating >= 50 & first_release_date != null; sort total_rating_count desc; limit 500; offset ${pag * 500};`,
        headers,
      );
      if (!Array.isArray(jogos) || jogos.length === 0) break;
      const novos = jogos.map(mapearJogo).filter((m) => m.titulo && !existentes.has(m.fonte_id));
      pulados += jogos.length - novos.length;
      for (const m of novos) existentes.add(m.fonte_id);
      if (dryRun) {
        importados += novos.length;
        continue;
      }
      const comSlug = resolverSlugs(novos, slugsOcupados);
      for (const m of comSlug) {
        try {
          const criada = await prisma.midia.create({
            data: {
              fonte: "igdb",
              fonte_id: m.fonte_id,
              tipo: "GAME",
              titulo: m.titulo,
              sinopse: m.sinopse,
              ano_lancamento: m.ano_lancamento,
              imagem_url: m.imagem_url,
              slug: m.slug,
              score: m.score,
            },
          });
          if (m.score != null) {
            await prisma.mediaScore.create({
              data: {
                midia_id: criada.id,
                score: m.score,
                num_fontes: 1,
                pesos_usados: {},
                score_publico: m.score,
                votos_total: m.votos,
              },
            });
            await prisma.avaliacaoFonte.create({
              data: {
                midia_id: criada.id,
                fonte: "igdb_publico",
                rating: m.score,
                media_fonte: 70,
                desvio_fonte: 15,
                votos: m.votos,
                url: `https://www.igdb.com/games/${slugify(m.titulo)}`,
              },
            });
          }
          importados++;
        } catch (e) {
          falhas++;
          if (falhas <= 5) saida(`  falha [${m.titulo}]: ${e.message?.slice(0, 120)}`);
        }
      }
      saida(`  ...página ${pag + 1}/${PAGINAS}`);
    }
    saida(
      `FIM importados=${dryRun ? "(dry) " : ""}${importados} pulados_existentes=${pulados} falhas=${falhas}`,
    );
    saida(dryRun ? "DRY_RUN — nada foi escrito (DRY_RUN=0 aplica)." : "APLICADO.");
  } finally {
    await prisma.$disconnect();
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href;
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`ERRO ${e && e.stack ? e.stack : String(e)}\n`);
    process.exit(1);
  });
}
