#!/usr/bin/env node
/**
 * T169 — prêmios em ESCALA via Wikidata (P166) casado por IMDb ID (filmes/
 * séries) e IGDB ID (games, P5732). Fonte legítima, estruturada e sem chave.
 *
 * Fluxo:
 *  1. TMDB /external_ids → IMDb ID de cada filme/série (450 req, 220ms espaçado);
 *  2. SPARQL em lotes (80 ids/lote): award label (pt/en) + ano (P585) +
 *     cerimônia (P361 "parte de") — só linhas COM ano entram;
 *  3. DEDUPE editorial: se a mídia já tem prêmio da mesma cerimônia
 *     (normalizada — curadoria T167 vence), a linha do Wikidata é pulada;
 *  4. Ingest idempotente (chave natural midia+organizacao+nome+ano).
 * DRY_RUN=1 default; node:https sem globals.
 */
import { request as httpsRequest } from "node:https";

const UA = "MEDIA-Rate/0.1 (beta; premios editoriais; mediarate.app)";
const TMDB_BASE = "https://api.themoviedb.org/3";
const WDQS = "https://query.wikidata.org/sparql";
const CAP_POR_MIDIA = 25;
const TAM_LOTE = 80;

function httpJson(url, { corpo, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      { method: corpo ? "POST" : "GET", headers: { "User-Agent": UA, ...headers } },
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

// ===========================================================================
// Puros (testados)
// ===========================================================================

/** Normaliza organização/cerimônia para dedupe editorial. */
export function normalizarOrg(org) {
  const x = String(org ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/oscar|academy award|academy of motion/.test(x)) return "oscar";
  if (/emmy/.test(x)) return "emmy";
  if (/golden globe/.test(x)) return "goldenglobe";
  if (/bafta/.test(x)) return "bafta";
  if (/game awards/.test(x)) return "tga";
  if (/hugo/.test(x)) return "hugo";
  if (/nebula/.test(x)) return "nebula";
  if (/pulitzer/.test(x)) return "pulitzer";
  if (/eisner/.test(x)) return "eisner";
  if (/palma/.test(x)) return "palma";
  return x.replace(/[^a-z0-9]+/g, "").slice(0, 24) || "outros";
}

/**
 * Puro: bindings SPARQL → prêmios (só COM ano; dedupe por
 * imdb+award+ano; organizacao = cerimônia (P361) || "Outros").
 */
export function mapearBindings(bindings) {
  const vistos = new Set();
  const saida = [];
  for (const b of bindings ?? []) {
    const id = b?.imdb?.value ?? b?.igdb?.value;
    const nome = b?.awardLabel?.value;
    if (!id || !nome || nome.startsWith("Q")) continue; // label faltando
    const ano = b?.ano?.value ? Number.parseInt(b.ano.value, 10) : null;
    if (!ano || !Number.isFinite(ano)) continue;
    const chave = `${id}::${nome}::${ano}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push({
      id,
      nome,
      organizacao: b?.parteDeLabel?.value || "Outros",
      ano,
    });
  }
  return saida;
}

/**
 * Puro: monta o plano — casa ids com mídias, aplica o dedupe editorial
 * (mídia já tem a mesma cerimônia normalizada → pula; curadoria vence)
 * e o cap por mídia.
 */
export function planear(prêmios, midiaPorId, premiosPorMidia) {
  const plano = [];
  let puladosOrg = 0;
  const porMidia = new Map();
  for (const p of prêmios) {
    const midia = midiaPorId.get(p.id);
    if (!midia) continue;
    const jaTem = premiosPorMidia.get(midia.midiaId) ?? new Set();
    const org = normalizarOrg(p.organizacao);
    if (jaTem.has(org)) {
      puladosOrg++;
      continue;
    }
    const n = (porMidia.get(midia.midiaId) ?? 0) + 1;
    if (n > CAP_POR_MIDIA) continue;
    porMidia.set(midia.midiaId, n);
    plano.push({
      midiaId: midia.midiaId,
      nome: p.nome,
      organizacao: p.organizacao,
      categoria: "",
      ano: p.ano,
      venceu: true,
    });
  }
  return { plano, puladosOrg };
}

const SPARQL_IDS = (variavel, ids) => `SELECT ?${variavel} ?awardLabel ?ano ?parteDeLabel WHERE {
  VALUES ?${variavel} { ${ids.map((i) => `'${i}'`).join(" ")} }
  ?item wdt:${variavel === "imdb" ? "P345" : "P5732"} ?${variavel} ; p:P166 ?st .
  ?st ps:P166 ?award .
  OPTIONAL { ?st pq:P585 ?data . BIND(YEAR(?data) AS ?ano) }
  OPTIONAL { ?award wdt:P361 ?parteDe }
  SERVICE wikibase:label { bd:serviceParam wikibase:language 'pt,en'. }
} LIMIT 4000`;

async function sparqlLote(variavel, ids) {
  const url = `${WDQS}?query=${encodeURIComponent(SPARQL_IDS(variavel, ids))}&format=json`;
  const j = await httpJson(url);
  return j?.results?.bindings ?? [];
}

function saida(msg) {
  process.stdout.write(`${msg}\n`);
}

async function main() {
  const dryRun = process.env.DRY_RUN !== "0";
  const chave = process.env.TMDB_API_KEY;
  if (!chave) {
    saida("ERRO: TMDB_API_KEY ausente.");
    process.exitCode = 1;
    return;
  }
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    // 1) IMDb IDs via TMDB (filmes/séries) — 1 req por título
    const midiasTs = await prisma.midia.findMany({
      where: { deleted_at: null, fonte: { in: ["tmdb", "tmdb_tv"] } },
      select: { id: true, titulo: true, tipo: true, fonte_id: true },
      orderBy: { id: "asc" },
    });
    const midiaPorId = new Map();
    let imdbOk = 0;
    let imdbFalha = 0;
    for (const m of midiasTs) {
      const caminho = m.tipo === "SERIE" ? "tv" : "movie";
      try {
        await esperar(220);
        const ext = await httpJson(
          `${TMDB_BASE}/${caminho}/${m.fonte_id}/external_ids?api_key=${chave}`,
        );
        if (ext.imdb_id) {
          midiaPorId.set(ext.imdb_id.replace(/^tt/, "tt"), { midiaId: m.id, titulo: m.titulo });
          imdbOk++;
        } else imdbFalha++;
      } catch {
        imdbFalha++;
      }
    }
    saida(`IMDB_IDS ok=${imdbOk} falha=${imdbFalha}`);

    // Games: IGDB id direto (P5732)
    const jogos = await prisma.midia.findMany({
      where: { deleted_at: null, fonte: "igdb", tipo: "GAME" },
      select: { id: true, titulo: true, fonte_id: true },
    });
    for (const j of jogos) midiaPorId.set(String(j.fonte_id), { midiaId: j.id, titulo: j.titulo });

    // 2) SPARQL em lotes
    const imdbIds = [...midiaPorId.keys()].filter((k) => k.startsWith("tt"));
    const igdbIds = jogos.map((j) => String(j.fonte_id));
    let bindings = [];
    for (let i = 0; i < imdbIds.length; i += TAM_LOTE) {
      const lote = imdbIds.slice(i, i + TAM_LOTE);
      await esperar(1500); // cortesia com o WDQS
      try {
        bindings = bindings.concat(await sparqlLote("imdb", lote));
      } catch (e) {
        saida(`  lote imdb ${i}: ${e.message}`);
      }
    }
    if (igdbIds.length) {
      for (let i = 0; i < igdbIds.length; i += TAM_LOTE) {
        const lote = igdbIds.slice(i, i + TAM_LOTE);
        await esperar(1500);
        try {
          bindings = bindings.concat(await sparqlLote("igdb", lote));
        } catch (e) {
          saida(`  lote igdb ${i}: ${e.message}`);
        }
      }
    }
    saida(`BINDINGS ${bindings.length}`);

    // 3) Plano com dedupe editorial
    const premiosExistentes = await prisma.premio.findMany({
      select: { midia_id: true, organizacao: true },
    });
    const premiosPorMidia = new Map();
    for (const p of premiosExistentes) {
      const conjunto = premiosPorMidia.get(p.midia_id) ?? new Set();
      conjunto.add(normalizarOrg(p.organizacao));
      premiosPorMidia.set(p.midia_id, conjunto);
    }
    const mapeados = mapearBindings(bindings);
    const { plano, puladosOrg } = planear(mapeados, midiaPorId, premiosPorMidia);
    saida(
      `PLANO: ${plano.length} prêmios novos (dedupe de cerimônia existente: ${puladosOrg}; sem ano/label fora do mapeamento: ${bindings.length - mapeados.length})`,
    );
    const porTitulo = new Map();
    for (const p of plano.slice(0, 12)) {
      const m = [...midiaPorId.values()].find((v) => v.midiaId === p.midiaId);
      porTitulo.set(m?.titulo ?? "?", (porTitulo.get(m?.titulo ?? "?") ?? 0) + 1);
    }
    for (const [titulo, n] of porTitulo) saida(`  ex.: ${titulo} +${n}`);
    if (dryRun) {
      saida("DRY_RUN — nada foi escrito (DRY_RUN=0 aplica).");
    } else {
      let criados = 0;
      for (const p of plano) {
        const existe = await prisma.premio.findFirst({
          where: {
            midia_id: p.midiaId,
            organizacao: p.organizacao,
            nome: p.nome,
            ano: p.ano,
          },
          select: { id: true },
        });
        if (existe) continue;
        await prisma.premio.create({
          data: {
            midia_id: p.midiaId,
            nome: p.nome,
            categoria: "",
            ano: p.ano,
            venceu: p.venceu,
            organizacao: p.organizacao,
          },
        });
        criados++;
      }
      saida(`APLICADO ${criados} prêmios.`);
    }
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
