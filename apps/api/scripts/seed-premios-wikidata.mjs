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
  if (/golden globe|globo de ouro/.test(x)) return "goldenglobe";
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
    // T-DADOS-81: `PREMIOS_LIMITE=n` processa só os primeiros n títulos — serve
    // de smoke test do fluxo inteiro (TMDB + SPARQL + gravação) em segundos.
    const limite = Number(process.env.PREMIOS_LIMITE ?? 0);
    const midiasTs = await prisma.midia.findMany({
      where: { deleted_at: null, fonte: { in: ["tmdb", "tmdb_tv"] } },
      select: { id: true, titulo: true, tipo: true, fonte_id: true },
      orderBy: { id: "asc" },
      ...(Number.isFinite(limite) && limite > 0 ? { take: limite } : {}),
    });
    if (limite > 0) saida(`LIMITE ${limite} títulos (smoke test)`);
    // T-DADOS-81: o id IMDb de quem já passou pela fila do OMDb está na URL da
    // linha (`https://www.imdb.com/title/tt…`) — usar antes de gastar uma
    // chamada do TMDB. Medido em produção: 11.714 de 50.399 títulos (23%).
    // Atenção: NÃO filtrar por `midia_id: { in: [...] }` — 50.399 ids estouram
    // o limite de 32.767 bind variables do Postgres (erro visto em produção).
    // As linhas do OMDb são poucas (~12 mil) e vêm inteiras.
    const comImdbNaUrl = await prisma.avaliacaoFonte.findMany({
      where: { fonte: "omdb" },
      select: { midia_id: true, url: true },
    });
    const imdbPorMidia = new Map();
    for (const a of comImdbNaUrl) {
      const id = a.url?.match(/imdb\.com\/title\/(tt\d+)/)?.[1];
      if (id) imdbPorMidia.set(a.midia_id, id);
    }
    const midiaPorId = new Map();
    let imdbOk = 0;
    let imdbFalha = 0;
    let imdbDaUrl = 0;
    let resolvidos = 0;
    for (const m of midiasTs) {
      const jaConhecido = imdbPorMidia.get(m.id);
      if (jaConhecido) {
        midiaPorId.set(jaConhecido, { midiaId: m.id, titulo: m.titulo });
        imdbDaUrl++;
        imdbOk++;
        resolvidos++;
        continue;
      }
      const caminho = m.tipo === "SERIE" ? "tv" : "movie";
      try {
        await esperar(220);
        const ext = await httpJson(
          `${TMDB_BASE}/${caminho}/${m.fonte_id}/external_ids?api_key=${chave}`,
        );
        if (ext.imdb_id) {
          midiaPorId.set(ext.imdb_id, { midiaId: m.id, titulo: m.titulo });
          imdbOk++;
        } else imdbFalha++;
      } catch {
        imdbFalha++;
      }
      resolvidos++;
      // T-DADOS-81: sem saída incremental o run fica ~4 h sem sinal nenhum no
      // log (e um deploy derruba tudo sem deixar registro do andamento).
      if (resolvidos % 500 === 0) {
        saida(
          `  … ${resolvidos}/${midiasTs.length} títulos (imdb ok=${imdbOk} falha=${imdbFalha})`,
        );
      }
    }
    saida(`IMDB_IDS ok=${imdbOk} (da URL do OMDb: ${imdbDaUrl}) falha=${imdbFalha}`);

    // Games: IGDB id direto (P5732).
    // T-DADOS-81: DESLIGADO por padrão. A propriedade P5732 do Wikidata não é
    // indexada com IGDB id (medido no T-DADOS-11: devolve ZERO para todo lote),
    // e cada run gastava ~330 consultas ao WDQS (26.377 jogos ÷ 80, 1,5 s de
    // espera entre elas — ~13 min) para não gravar nada. `PREMIOS_IGDB=1`
    // religa se a fonte um dia passar a indexar.
    const incluirIgdb = process.env.PREMIOS_IGDB === "1";
    const jogos = incluirIgdb
      ? await prisma.midia.findMany({
          where: { deleted_at: null, fonte: "igdb", tipo: "GAME" },
          select: { id: true, titulo: true, fonte_id: true },
        })
      : [];
    if (!incluirIgdb)
      saida("GAMES: pulados (P5732 do Wikidata não indexa IGDB; PREMIOS_IGDB=1 religa)");
    for (const j of jogos) midiaPorId.set(String(j.fonte_id), { midiaId: j.id, titulo: j.titulo });

    // 2) SPARQL em lotes — T-DADOS-81: aplica CADA lote antes do próximo.
    // Antes, os `bindings` eram acumulados em memória e os prêmios só eram
    // gravados no fim: um deploy no meio (ou timeout do WDQS) perdia tudo.
    const premiosExistentes = await prisma.premio.findMany({
      select: { midia_id: true, organizacao: true },
    });
    const premiosPorMidia = new Map();
    for (const p of premiosExistentes) {
      const conjunto = premiosPorMidia.get(p.midia_id) ?? new Set();
      conjunto.add(normalizarOrg(p.organizacao));
      premiosPorMidia.set(p.midia_id, conjunto);
    }
    const aplicarLote = async (bindings) => {
      const mapeados = mapearBindings(bindings);
      const { plano, puladosOrg } = planear(mapeados, midiaPorId, premiosPorMidia);
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
        // Mantém o dedupe em memória coerente entre lotes.
        const conjunto = premiosPorMidia.get(p.midiaId) ?? new Set();
        conjunto.add(normalizarOrg(p.organizacao));
        premiosPorMidia.set(p.midiaId, conjunto);
        criados++;
      }
      return { criados, plano: plano.length, puladosOrg };
    };

    const imdbIds = [...midiaPorId.keys()].filter((k) => k.startsWith("tt"));
    const igdbIds = jogos.map((j) => String(j.fonte_id));
    saida(`SPARQL ids: imdb=${imdbIds.length} igdb=${igdbIds.length} (lotes de ${TAM_LOTE})`);
    let totalBindings = 0;
    let totalPlano = 0;
    let totalCriados = 0;
    for (const [variavel, ids] of [
      ["imdb", imdbIds],
      ["igdb", igdbIds],
    ]) {
      for (let i = 0; i < ids.length; i += TAM_LOTE) {
        const lote = ids.slice(i, i + TAM_LOTE);
        await esperar(1500); // cortesia com o WDQS
        let bindings = [];
        try {
          bindings = await sparqlLote(variavel, lote);
        } catch (e) {
          saida(`  lote ${variavel} ${i}: ${e.message}`);
          continue;
        }
        totalBindings += bindings.length;
        if (bindings.length === 0) continue;
        if (dryRun) {
          const mapeados = mapearBindings(bindings);
          const { plano } = planear(mapeados, midiaPorId, premiosPorMidia);
          totalPlano += plano.length;
          continue;
        }
        const { criados, plano } = await aplicarLote(bindings);
        totalPlano += plano;
        totalCriados += criados;
        saida(
          `  lote ${variavel} ${i}/${ids.length}: bindings=${bindings.length} plano=${plano} criados=${criados} (total ${totalCriados})`,
        );
      }
    }
    saida(`BINDINGS ${totalBindings}`);
    saida(`PLANO: ${totalPlano} prêmios (dedupe de cerimônia existente aplicado por lote)`);
    if (dryRun) {
      saida("DRY_RUN — nada foi escrito (DRY_RUN=0 aplica).");
    } else {
      saida(`APLICADO ${totalCriados} prêmios.`);
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
