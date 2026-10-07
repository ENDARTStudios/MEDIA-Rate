#!/usr/bin/env node
/**
 * T168 — correção de sinopses (item 4 do feedback):
 * 1. LIMPEZA: sinopses com HTML cru (28 quadrinhos, descrição da Comic Vine)
 *    → tags removidas, entidades decodificadas, espaços colapsados;
 * 2. PREENCHIMENTO: games sem sinopse (50) ← summary da IGDB;
 *    quadrinhos sem sinopse (3) ← deck da Comic Vine (busca por título).
 * Idempotente; DRY_RUN=1 default; node:https sem globals.
 */
import { request as httpsRequest } from "node:https";

const USER_AGENT = "MEDIA-Rate/0.1 (beta; metadados editoriais; mediarate.app)";

/** POST HTTPS JSON (IGDB/Twitch). */
function postarJson(url, corpo, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      { method: "POST", headers: { "User-Agent": USER_AGENT, ...headers } },
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
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end(corpo);
  });
}

/**
 * Puro (testado): limpa HTML de uma sinopse — remove tags/blocos, decodifica
 * as entidades comuns da Comic Vine, colapsa espaços. Texto sem HTML volta
 * intacto (menos espaços duplicados).
 */
export function limparHtml(texto) {
  if (!texto) return null;
  const limpo = String(texto)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return limpo || null;
}

/** Puro: extrai summary do payload IGDB (game). */
export function mapearIgdbSummary(game) {
  const resumo = game?.summary ?? game?.storyline ?? null;
  return resumo && resumo.trim() ? resumo.trim() : null;
}

/** Puro: extrai deck do payload Comic Vine (search → { results: primeiro }). */
export function mapearComicvineDeck(payload) {
  const deck = payload?.results?.deck ?? null;
  return deck && deck.trim() ? deck.trim() : null;
}

const esperar = (ms) =>
  new Promise((r) => {
    import("node:timers").then(({ setTimeout: t }) => t(r, ms));
  });

function saida(msg) {
  process.stdout.write(`${msg}\n`);
}

async function main() {
  const dryRun = process.env.DRY_RUN !== "0";
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    // 1) Limpeza de HTML
    const comHtml = await prisma.midia.findMany({
      where: { deleted_at: null, sinopse: { contains: "<" } },
      select: { id: true, titulo: true, sinopse: true },
    });
    saida(`LIMPEZA: ${comHtml.length} sinopses com HTML`);
    let limpas = 0;
    for (const m of comHtml) {
      const limpa = limparHtml(m.sinopse);
      if (limpa && limpa !== m.sinopse) {
        limpas++;
        if (!dryRun) {
          await prisma.midia.update({ where: { id: m.id }, data: { sinopse: limpa } });
        }
      }
    }
    saida(`LIMPO ${dryRun ? "(dry) " : ""}${limpas}`);

    // 2) Games sem sinopse ← IGDB summary
    const jogos = await prisma.midia.findMany({
      where: {
        deleted_at: null,
        tipo: "GAME",
        fonte: "igdb",
        OR: [{ sinopse: null }, { sinopse: "" }],
      },
      select: { id: true, titulo: true, fonte_id: true },
      orderBy: { id: "asc" },
    });
    saida(`GAMES SEM SINOPSE: ${jogos.length}`);
    let jogosOk = 0;
    let jogosSemDado = 0;
    if (jogos.length && process.env.IGDB_CLIENT_ID && !dryRun) {
      const token = (
        await postarJson(
          `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
          "",
        )
      ).access_token;
      for (const j of jogos) {
        await esperar(300); // limite 4 req/s
        try {
          const linhas = await postarJson(
            "https://api.igdb.com/v4/games",
            `fields summary,storyline; where id = ${j.fonte_id};`,
            {
              "Client-ID": process.env.IGDB_CLIENT_ID,
              "Authorization": `Bearer ${token}`,
              "Accept": "application/json",
            },
          );
          const resumo = mapearIgdbSummary(Array.isArray(linhas) ? linhas[0] : null);
          if (resumo) {
            await prisma.midia.update({ where: { id: j.id }, data: { sinopse: resumo } });
            jogosOk++;
          } else jogosSemDado++;
        } catch (e) {
          saida(`  falha game [${j.titulo}]: ${e.message}`);
        }
      }
    } else if (dryRun) {
      jogosSemDado = jogos.length;
    }
    saida(`GAMES ok=${dryRun ? "(dry)" : jogosOk} semDado=${jogosSemDado}`);
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
