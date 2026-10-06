#!/usr/bin/env node
/**
 * T164 (Onda C1) — backfill de metadados ricos via TMDB para FILME/SERIE.
 *
 * Todas as mídias tmdb/tmdb_tv têm fonte_id = ID do TMDB — lookup direto,
 * sem busca por título e sem scraping. Preenche:
 * - midia_elenco (top 15 do cast com personagem/foto);
 * - midia_produtora (companies PRODUTORA + networks NETWORK);
 * - midia.backdrop_url (banner w1280).
 *
 * Idempotente (upsert por [midia_id, fonte, fonte_id]; backdrop update).
 * Uso (apps/api): DRY_RUN=1 default (só planeja/conta); DRY_RUN=0 aplica.
 * No container de produção: pipe via stdin (a imagem não embarca scripts/).
 */
import { request as httpsRequest } from "node:https";

/** GET HTTPS com parse JSON — node:https (sem globals de browser p/ lint). */
function buscarJson(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, { method: "GET" }, (res) => {
      let dados = "";
      res.on("data", (c) => (dados += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(dados));
        } catch (e) {
          reject(new Error(`JSON inválido: ${e.message}`));
        }
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

/** Elenco: top N, personagem do primeiro papel (tv aggregate) ou direto. */
function mapearElenco(cast, limite = 15) {
  return (cast ?? []).slice(0, limite).map((a) => ({
    fonte_id: String(a.id),
    nome: a.name,
    personagem: a.roles?.[0]?.character ?? a.character ?? null,
    ordem: a.order ?? 0,
    foto_url: a.profile_path ? `${IMG}/w185${a.profile_path}` : null,
  }));
}

function mapearEmpresas(companies, papel) {
  const vistos = new Set();
  const saida = [];
  for (const c of companies ?? []) {
    if (!c?.name || vistos.has(c.id)) continue;
    vistos.add(c.id);
    saida.push({ fonte_id: String(c.id), nome: c.name, papel });
  }
  return saida;
}

export function mapearMovie(payload) {
  return {
    elenco: mapearElenco(payload.credits?.cast),
    produtoras: mapearEmpresas(payload.production_companies, "PRODUTORA"),
    backdrop_url: payload.backdrop_path ? `${IMG}/w1280${payload.backdrop_path}` : null,
  };
}

export function mapearTv(payload) {
  const cast = payload.aggregate_credits?.cast ?? payload.credits?.cast;
  return {
    elenco: mapearElenco(cast),
    produtoras: [
      ...mapearEmpresas(payload.production_companies, "PRODUTORA"),
      ...mapearEmpresas(payload.networks, "NETWORK"),
    ],
    backdrop_url: payload.backdrop_path ? `${IMG}/w1280${payload.backdrop_path}` : null,
  };
}

async function buscarTmdb(id, tipo, chave) {
  const append = tipo === "SERIE" ? "credits,aggregate_credits" : "credits";
  const url = `${TMDB_BASE}/${tipo === "SERIE" ? "tv" : "movie"}/${id}?api_key=${chave}&language=pt-BR&append_to_response=${append}`;
  return buscarJson(url);
}

async function main() {
  const dryRun = process.env.DRY_RUN !== "0";
  const chave = process.env.TMDB_API_KEY;
  if (!chave) {
    saida("ERRO: TMDB_API_KEY ausente no ambiente.");
    process.exitCode = 1;
    return;
  }
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const midias = await prisma.midia.findMany({
      where: { deleted_at: null, fonte: { in: ["tmdb", "tmdb_tv"] } },
      select: { id: true, titulo: true, tipo: true, fonte: true, fonte_id: true },
      orderBy: { id: "asc" },
    });
    saida(`ALVO: ${midias.length} mídias tmdb/tmdb_tv (DRY_RUN=${dryRun ? "1" : "0"})`);
    let ok = 0;
    let semDado = 0;
    let falhas = 0;
    const falhasExemplos = [];
    for (const m of midias) {
      try {
        const payload = await buscarTmdb(m.fonte_id, m.tipo, chave);
        const mapa = m.tipo === "SERIE" ? mapearTv(payload) : mapearMovie(payload);
        if (!mapa.elenco.length && !mapa.produtoras.length && !mapa.backdrop_url) {
          semDado++;
          continue;
        }
        if (dryRun) {
          ok++;
          continue;
        }
        for (const a of mapa.elenco) {
          await prisma.midiaElenco.upsert({
            where: {
              midia_id_fonte_fonte_id: {
                midia_id: m.id,
                fonte: "tmdb",
                fonte_id: a.fonte_id,
              },
            },
            create: {
              midia_id: m.id,
              fonte: "tmdb",
              fonte_id: a.fonte_id,
              nome: a.nome,
              personagem: a.personagem,
              ordem: a.ordem,
              foto_url: a.foto_url,
            },
            update: {
              nome: a.nome,
              personagem: a.personagem,
              ordem: a.ordem,
              foto_url: a.foto_url,
            },
          });
        }
        for (const emp of mapa.produtoras) {
          await prisma.midiaProdutora.upsert({
            where: {
              midia_id_fonte_fonte_id: {
                midia_id: m.id,
                fonte: "tmdb",
                fonte_id: emp.fonte_id,
              },
            },
            create: {
              midia_id: m.id,
              fonte: "tmdb",
              fonte_id: emp.fonte_id,
              nome: emp.nome,
              papel: emp.papel,
            },
            update: { nome: emp.nome, papel: emp.papel },
          });
        }
        if (mapa.backdrop_url) {
          await prisma.midia.update({
            where: { id: m.id },
            data: { backdrop_url: mapa.backdrop_url },
          });
        }
        ok++;
        if (ok % 50 === 0) saida(`  ...${ok}/${midias.length}`);
      } catch (e) {
        falhas++;
        if (falhasExemplos.length < 5) falhasExemplos.push(`${m.titulo}: ${e.message}`);
      }
    }
    saida(`FIM ok=${ok} semDado=${semDado} falhas=${falhas}`);
    for (const f of falhasExemplos) saida(`  falha: ${f}`);
  } finally {
    await prisma.$disconnect();
  }
}

function saida(msg) {
  process.stdout.write(`${msg}\n`);
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
