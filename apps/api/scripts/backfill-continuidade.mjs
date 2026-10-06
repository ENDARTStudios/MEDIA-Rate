#!/usr/bin/env node
/**
 * T165 (Onda C3) — continuidade em escala via TMDB + IGDB:
 * - SÉRIES (225, fonte tmdb_tv): cria/atualiza Temporada + Episódio com nota
 *   pública do TMDB (vote_average 0–10) — "nota por temporada/episódio" real
 *   para TODO o catálogo de séries;
 * - FILMES (225, fonte tmdb): belongs_to_collection → franquia (reutiliza
 *   franquia curada por slug-base; cria nova só se inexistente) + arestas
 *   SEQUENCIA_DE entre filmes consecutivos da coleção (item 22);
 * - ORIGEM (450): production_countries / origin_country → midia.pais_origem
 *   (item 21);
 * - GAMES (51, fonte igdb): collection.name → franquia (mesmo tratamento).
 *
 * Idempotente (upserts); DRY_RUN=1 default; node:https sem globals.
 * Franquias curadas (T163) têm prioridade — o automático nunca reescreve
 * as ordens delas, só adiciona vínculos/arestas.
 */
import { request as httpsRequest } from "node:https";

const USER_AGENT = "MEDIA-Rate/0.1 (beta; metadados editoriais; mediarate.app)";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IGDB_BASE = "https://api.igdb.com/v4/games";
const MAX_TEMPORADAS = 20;

/** GET/POST HTTPS com JSON (node:https — sem globals de browser). */
function httpJson(url, { method = "GET", corpo, headers = {}, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method,
        headers: {
          "User-Agent": USER_AGENT,
          ...(corpo ? { "Content-Type": "text/plain" } : {}),
          ...headers,
        },
      },
      (res) => {
        let dados = "";
        res.on("data", (c) => (dados += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(dados));
          } catch (e) {
            reject(new Error(`JSON inválido (${res.statusCode}): ${e.message}`));
          }
        });
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end(corpo);
  });
}

const esperar = (ms) =>
  new Promise((r) => {
    import("node:timers").then(({ setTimeout: t }) => t(r, ms));
  });

// ===========================================================================
// Mappers puros (testados)
// ===========================================================================

/** Slug base para casar franquia curada: "Duna: Coleção" → "duna". */
export function slugBaseFranquia(nome) {
  return String(nome)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-(colecao|collection)$/, "")
    .replace(/^-+|-+$/g, "");
}

/**
 * Coleção + países do payload TMDB de filme.
 * { colecaoNome, paisOrigem } — pais = primeiro production_countries.
 */
export function mapearColecaoFilme(payload) {
  return {
    colecaoNome: payload.belongs_to_collection?.name ?? null,
    paisOrigem: payload.production_countries?.[0]?.iso_3166_1 ?? null,
  };
}

/** País de origem de série (origin_country[0]) ou null. */
export function mapearPaisSerie(payload) {
  return payload.origin_country?.[0] ?? null;
}

/**
 * Temporadas do payload /tv/{id}: só com air_date (exibidas), cap 20,
 * ordenadas por season_number.
 */
export function mapearListaTemporadas(tvPayload) {
  return (tvPayload.seasons ?? [])
    .filter((s) => s.air_date && s.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number)
    .slice(0, MAX_TEMPORADAS)
    .map((s) => ({
      numero: s.season_number,
      titulo: s.name ?? null,
      ano: Number(s.air_date.slice(0, 4)),
      poster: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : null,
    }));
}

/**
 * Episódios do payload /tv/{id}/season/{n}: nota pública = vote_average
 * (0–10), crítica fica null (TMDB não expõe).
 */
export function mapearEpisodios(seasonPayload) {
  return (seasonPayload.episodes ?? []).map((e) => ({
    numero: e.episode_number,
    titulo: e.name ?? "",
    data_exibicao: e.air_date ? new Date(`${e.air_date}T00:00:00Z`) : null,
    nota_publico: e.vote_average != null && e.vote_average > 0 ? e.vote_average : null,
    nota_critica: null,
  }));
}

/** Arestas SEQUENCIA_DE entre filmes consecutivos de uma coleção (por ano). */
export function arestasSequencia(filmes) {
  const ordenados = [...filmes].filter((f) => f.ano).sort((a, b) => a.ano - b.ano);
  const saida = [];
  for (let i = 1; i < ordenados.length; i++) {
    saida.push({ anteriorId: ordenados[i - 1].id, sequenciaId: ordenados[i].id });
  }
  return saida;
}

// ===========================================================================
// Main
// ===========================================================================

function saida(msg) {
  process.stdout.write(`${msg}\n`);
}

let pedidosTmdb = 0;
async function tmdb(caminho, chave) {
  const url = `${TMDB_BASE}${caminho}${caminho.includes("?") ? "&" : "?"}api_key=${chave}&language=pt-BR`;
  pedidosTmdb++;
  await esperar(220); // ~4.5 req/s — respeita o TMDB
  return httpJson(url);
}

async function tokenIgdb() {
  const res = await httpJson(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST", corpo: "" },
  );
  if (!res.access_token) throw new Error("OAuth Twitch sem access_token");
  return res.access_token;
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
    // ---- Franquias por slug (cache) com reuso de curadas ----
    const franquiaPorSlug = new Map();
    async function franquiaDe(nomeColecao) {
      const base = slugBaseFranquia(nomeColecao);
      if (!base) return null;
      if (franquiaPorSlug.has(base)) return franquiaPorSlug.get(base);
      const existentes = await prisma.franquia.findMany({
        where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] },
        select: { id: true, slug: true },
      });
      let franquia = existentes[0] ?? null;
      if (!franquia && !dryRun) {
        franquia = await prisma.franquia.upsert({
          where: { slug: base },
          create: {
            slug: base,
            nome: nomeColecao.replace(/:?\s*(Coleção|Collection)$/i, "").trim(),
          },
          update: {},
        });
      }
      franquiaPorSlug.set(base, franquia);
      return franquia;
    }

    // ---- FILMES: coleção + país + arestas ----
    const filmes = await prisma.midia.findMany({
      where: { deleted_at: null, fonte: "tmdb", tipo: "FILME" },
      select: { id: true, titulo: true, fonte_id: true, ano_lancamento: true, pais_origem: true },
      orderBy: { id: "asc" },
    });
    saida(`ALVO FILMES: ${filmes.length}`);
    let colecoes = 0;
    let paises = 0;
    let falhas = 0;
    const porColecao = new Map();
    for (const f of filmes) {
      try {
        const payload = await tmdb(`/movie/${f.fonte_id}`, chave);
        const m = mapearColecaoFilme(payload);
        if (!f.pais_origem && m.paisOrigem) {
          paises++;
          if (!dryRun) {
            await prisma.midia.update({ where: { id: f.id }, data: { pais_origem: m.paisOrigem } });
          }
        }
        if (m.colecaoNome) {
          const franquia = await franquiaDe(m.colecaoNome);
          if (franquia) {
            colecoes++;
            const lista = porColecao.get(franquia.id) ?? [];
            lista.push({ id: f.id, ano: f.ano_lancamento });
            porColecao.set(franquia.id, lista);
            if (!dryRun) {
              await prisma.midiaFranquia.upsert({
                where: { midia_id_franquia_id: { midia_id: f.id, franquia_id: franquia.id } },
                create: {
                  midia_id: f.id,
                  franquia_id: franquia.id,
                  ordem_lancamento: f.ano_lancamento ?? 9999,
                  ordem_cronologica: null,
                },
                // Curadas (ordens manuais) NÃO são sobrescritas: update só se
                // ainda não houver vínculo — upsert com update vazio.
                update: {},
              });
            }
          }
        }
      } catch (e) {
        falhas++;
        if (falhas <= 5) saida(`  falha filme [${f.titulo}]: ${e.message}`);
      }
    }
    saida(`FIM FILMES colecoes=${colecoes} paises=${paises} falhas=${falhas}`);

    // ---- GAMES: collection → franquia ----
    const jogos = await prisma.midia.findMany({
      where: { deleted_at: null, fonte: "igdb", tipo: "GAME" },
      select: { id: true, titulo: true, fonte_id: true, ano_lancamento: true },
      orderBy: { id: "asc" },
    });
    let jogosFr = 0;
    if (jogos.length && process.env.IGDB_CLIENT_ID) {
      const token = await tokenIgdb();
      for (const j of jogos) {
        try {
          await esperar(300);
          const linhas = await httpJson(IGDB_BASE, {
            method: "POST",
            corpo: `fields name,collection.name; where id = ${j.fonte_id};`,
            headers: {
              "Client-ID": process.env.IGDB_CLIENT_ID,
              "Authorization": `Bearer ${token}`,
              "Accept": "application/json",
            },
          });
          const nome = Array.isArray(linhas) ? linhas[0]?.collection?.name : null;
          if (!nome) continue;
          const franquia = await franquiaDe(nome);
          if (franquia) {
            jogosFr++;
            if (!dryRun) {
              await prisma.midiaFranquia.upsert({
                where: { midia_id_franquia_id: { midia_id: j.id, franquia_id: franquia.id } },
                create: {
                  midia_id: j.id,
                  franquia_id: franquia.id,
                  ordem_lancamento: j.ano_lancamento ?? 9999,
                  ordem_cronologica: null,
                },
                update: {},
              });
            }
          }
        } catch (e) {
          saida(`  falha game [${j.titulo}]: ${e.message}`);
        }
      }
    }
    saida(`FIM GAMES vinculos_franquia=${jogosFr}`);

    // ---- Arestas SEQUENCIA_DE (filmes consecutivos por coleção) ----
    let arestas = 0;
    if (!dryRun) {
      for (const [franquiaId, lista] of porColecao) {
        for (const a of arestasSequencia(lista)) {
          await prisma.relacaoObra.upsert({
            where: { origem_id_destino_id: { origem_id: a.anteriorId, destino_id: a.sequenciaId } },
            create: {
              origem_id: a.anteriorId,
              destino_id: a.sequenciaId,
              tipo: "SEQUENCIA_DE",
              nota_editorial: "Sequência direta na coleção",
            },
            update: {},
          });
          arestas++;
        }
        void franquiaId;
      }
    }
    saida(
      `ARESTAS_SEQUENCIA ${dryRun ? "(dry) " : ""}${dryRun ? porColecao.size + " coleções" : arestas}`,
    );

    // ---- SÉRIES: temporadas + episódios notados + país ----
    const series = await prisma.midia.findMany({
      where: { deleted_at: null, fonte: "tmdb_tv", tipo: "SERIE" },
      select: { id: true, titulo: true, fonte_id: true, pais_origem: true },
      orderBy: { id: "asc" },
    });
    saida(`ALVO SERIES: ${series.length}`);
    let seriesComTemp = 0;
    let temporadas = 0;
    let episodios = 0;
    let paisesSerie = 0;
    let falhasSerie = 0;
    for (const s of series) {
      try {
        const tv = await tmdb(`/tv/${s.fonte_id}`, chave);
        if (!s.pais_origem) {
          const pais = mapearPaisSerie(tv);
          if (pais) {
            paisesSerie++;
            if (!dryRun) {
              await prisma.midia.update({ where: { id: s.id }, data: { pais_origem: pais } });
            }
          }
        }
        const lista = mapearListaTemporadas(tv);
        if (lista.length === 0) continue;
        seriesComTemp++;
        for (const t of lista) {
          if (!dryRun) {
            const temporada = await prisma.temporada.upsert({
              where: { midia_id_numero: { midia_id: s.id, numero: t.numero } },
              create: {
                midia_id: s.id,
                numero: t.numero,
                titulo: t.titulo,
                ano: t.ano,
                poster_url: t.poster,
              },
              update: { titulo: t.titulo, ano: t.ano, poster_url: t.poster },
            });
            temporadas++;
            const season = await tmdb(`/tv/${s.fonte_id}/season/${t.numero}`, chave);
            for (const e of mapearEpisodios(season)) {
              await prisma.episodio.upsert({
                where: { temporada_id_numero: { temporada_id: temporada.id, numero: e.numero } },
                create: {
                  temporada_id: temporada.id,
                  numero: e.numero,
                  titulo: e.titulo,
                  data_exibicao: e.data_exibicao,
                  nota_publico: e.nota_publico,
                  nota_critica: null,
                },
                update: {
                  titulo: e.titulo,
                  data_exibicao: e.data_exibicao,
                  nota_publico: e.nota_publico,
                },
              });
              episodios++;
            }
          } else {
            temporadas++;
            episodios += 8; // estimativa para o relatório de dry-run
          }
        }
      } catch (e) {
        falhasSerie++;
        if (falhasSerie <= 5) saida(`  falha serie [${s.titulo}]: ${e.message}`);
      }
    }
    saida(
      `FIM SERIES comTemporadas=${seriesComTemp} temporadas=${temporadas} episodios=${episodios} paises=${paisesSerie} falhas=${falhasSerie}`,
    );
    saida(`TOTAL tmdb_requests=${pedidosTmdb}`);
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
