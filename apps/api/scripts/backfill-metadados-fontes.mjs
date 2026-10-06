#!/usr/bin/env node
/**
 * T164 (Onda C2) — backfill de produtoras/editoras para GAME/COMIC/LIVRO
 * pelas fontes oficiais já registradas (IDs externos já persistidos):
 * - GAME  (fonte=igdb)        → involved_companies → papel ESTUDIO/PUBLISHER→PRODUTORA (Twitch OAuth client_credentials);
 * - COMIC (fonte=comicvine)   → volume.publisher   → papel EDITORA;
 * - LIVRO (fonte=openlibrary) → editions.publishers → papel EDITORA.
 * Idempotente (upsert [midia_id, fonte, fonte_id]); DRY_RUN=1 default.
 * HTTP via node:https (sem globals de browser p/ lint).
 */
import { request as httpsRequest } from "node:https";
import { setTimeout as esperar } from "node:timers";

const USER_AGENT = "MEDIA-Rate/0.1 (beta; metadados editoriais; mediarate.app)";

/** GET HTTPS genérico (JSON). */
function buscarJson(url, { headers = {}, timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      { method: "GET", headers: { "User-Agent": USER_AGENT, ...headers } },
      (res) => {
        let dados = "";
        res.on("data", (c) => (dados += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(dados));
          } catch (e) {
            reject(new Error(`JSON inválido: ${e.message}`));
          }
        });
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

/** POST HTTPS (form-encoded) — OAuth Twitch. */
function postarForm(url, corpo, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
      },
      (res) => {
        let dados = "";
        res.on("data", (c) => (dados += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(dados));
          } catch (e) {
            reject(new Error(`JSON inválido: ${e.message}`));
          }
        });
      },
    );
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end(corpo);
  });
}

// ===========================================================================
// Mappers puros (testados)
// ===========================================================================

/**
 * IGDB involved_companies → [{ fonte_id, nome, papel }] (ESTUDIO | PRODUTORA).
 * Cap editorial: no máx 2 estúdios e 3 publishers (o IGDB lista todos os
 * publishers regionais — o hub quer os principais).
 */
export function mapearIgdb(game) {
  const studios = [];
  const publishers = [];
  for (const ic of game?.involved_companies ?? []) {
    const company = ic.company;
    if (!company?.name) continue;
    if (ic.developer && studios.length < 2) {
      studios.push({ fonte_id: String(company.id), nome: company.name, papel: "ESTUDIO" });
    }
    if (ic.publisher && publishers.length < 3) {
      publishers.push({ fonte_id: String(company.id), nome: company.name, papel: "PRODUTORA" });
    }
  }
  return [...studios, ...publishers];
}

/** Comic Vine volume → editora (papel EDITORA) ou []. */
export function mapearComicvine(volume) {
  const pub = volume?.results?.publisher;
  if (!pub?.name) return [];
  return [{ fonte_id: String(pub.id), nome: pub.name, papel: "EDITORA" }];
}

/**
 * OpenLibrary: editoras por FREQUÊNCIA entre as editions (a editora canônica
 * se repete; print-on-demand aparece 1x) — junk filter (nomes genéricos tipo
 * "Editora", CreateSpace etc.) e cap 3.
 */
const LIXO_OL =
  /^(editora$|editora e|independently published|createspace|mybook|kindle|ebook|edição do autor|amazon|smashwords|project gutenberg|lci|bol\.com)/i;

export function mapearOpenlibrary(payload) {
  const editions = payload?.results?.entries ?? payload?.entries ?? [];
  const contagem = new Map();
  for (const ed of editions) {
    const vistasEd = new Set();
    for (const pub of ed.publishers ?? []) {
      const nome = typeof pub === "string" ? pub : pub?.name;
      if (!nome || LIXO_OL.test(nome.trim()) || vistasEd.has(nome)) continue;
      vistasEd.add(nome);
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    }
  }
  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nome]) => ({
      fonte_id: `ol:${nome.toLowerCase().slice(0, 60)}`,
      nome,
      papel: "EDITORA",
    }));
}

// ===========================================================================
// Fetchers por fonte
// ===========================================================================

let tokenTwitch = null;
async function tokenIgdb() {
  if (tokenTwitch && tokenTwitch.expira > Date.now() + 60_000) return tokenTwitch.valor;
  const res = await postarForm(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    "",
  );
  if (!res.access_token) throw new Error("OAuth Twitch sem access_token");
  tokenTwitch = { valor: res.access_token, expira: Date.now() + (res.expires_in ?? 3600) * 1000 };
  return tokenTwitch.valor;
}

/** IGDB via POST (a API da IGDB é POST com query APQL no corpo). */
function igdbPost(corpo, headers) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      "https://api.igdb.com/v4/games",
      { method: "POST", headers },
      (res) => {
        let dados = "";
        res.on("data", (c) => (dados += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(dados));
          } catch (e) {
            reject(new Error(`JSON inválido: ${e.message}`));
          }
        });
      },
    );
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end(corpo);
  });
}

async function buscarIgdbJogo(midia) {
  const token = await tokenIgdb();
  const linhas = await igdbPost(
    `fields name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher; where id = ${midia.fonte_id};`,
    {
      "Client-ID": process.env.IGDB_CLIENT_ID,
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    },
  );
  return Array.isArray(linhas) ? linhas[0] : null;
}

/**
 * Comic Vine: fonte_id numérico → volume direto; slug (seed editorial) →
 * busca pelo TÍTULO da mídia (search devolve array → normaliza para
 * { results: primeiro }, formato que o mapper espera).
 */
async function buscarComicvine(midia) {
  const base = "https://comicvine.gamespot.com/api";
  const ref = String(midia.fonte_id);
  if (/^\d+$/.test(ref)) {
    return buscarJson(
      `${base}/volume/4050-${ref}/?api_key=${process.env.COMICVINE_API_KEY}&format=json&field_list=name,publisher`,
    );
  }
  const busca = await buscarJson(
    `${base}/search/?api_key=${process.env.COMICVINE_API_KEY}&format=json&resources=volume&query=${encodeURIComponent(midia.titulo)}&field_list=id,name,publisher,count_of_issues&limit=10`,
  );
  const candidatos = Array.isArray(busca?.results) ? busca.results : [];
  // A edição ORIGINAL tem muito mais issues que coletâneas estrangeiras.
  const melhor = candidatos.sort((a, b) => (b.count_of_issues ?? 0) - (a.count_of_issues ?? 0))[0];
  return melhor ? { results: melhor } : {};
}

/** OpenLibrary: busca por título → work key → editions (publishers). */
async function buscarOpenlibrary(midia) {
  const busca = await buscarJson(
    `https://openlibrary.org/search.json?title=${encodeURIComponent(midia.titulo)}&fields=key&limit=1`,
  );
  const key = busca?.docs?.[0]?.key;
  if (!key) return {};
  return buscarJson(`https://openlibrary.org${key}/editions.json`);
}

// ===========================================================================
// Main
// ===========================================================================

function saida(msg) {
  process.stdout.write(`${msg}\n`);
}

async function main() {
  const dryRun = process.env.DRY_RUN !== "0";
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const grupos = [
      {
        tipo: "GAME",
        fonte: "igdb",
        papel: ["ESTUDIO", "PRODUTORA"],
        buscar: buscarIgdbJogo,
        mapear: mapearIgdb,
      },
      {
        tipo: "COMIC",
        fonte: "comicvine",
        papel: ["EDITORA"],
        buscar: buscarComicvine,
        mapear: mapearComicvine,
      },
      {
        tipo: "LIVRO",
        fonte: "openlibrary",
        papel: ["EDITORA"],
        buscar: buscarOpenlibrary,
        mapear: mapearOpenlibrary,
      },
    ];
    for (const g of grupos) {
      const midias = await prisma.midia.findMany({
        where: { deleted_at: null, tipo: g.tipo, fonte: g.fonte },
        select: { id: true, titulo: true, fonte_id: true },
        orderBy: { id: "asc" },
      });
      saida(`ALVO ${g.tipo}/${g.fonte}: ${midias.length} mídias`);
      let ok = 0;
      let semDado = 0;
      let falhas = 0;
      for (const m of midias) {
        try {
          if (g.tipo === "GAME") {
            // IGDB/Twitch: limite de 4 req/s — bursts viram 429 silencioso
            // (resposta JSON sem array → apareceria como "sem dado").
            await new Promise((r) => esperar(r, 300));
          }
          const payload = await g.buscar(m);
          const empresas = g.mapear(payload);
          if (empresas.length === 0) {
            semDado++;
            continue;
          }
          if (!dryRun) {
            // Replace-semantics por fonte: o dataset da fonte é canônico —
            // o upsert sozinho deixaria lixo de execuções anteriores.
            await prisma.midiaProdutora.deleteMany({
              where: { midia_id: m.id, fonte: g.fonte },
            });
            for (const emp of empresas) {
              await prisma.midiaProdutora.upsert({
                where: {
                  midia_id_fonte_fonte_id: {
                    midia_id: m.id,
                    fonte: g.fonte,
                    fonte_id: emp.fonte_id,
                  },
                },
                create: {
                  midia_id: m.id,
                  fonte: g.fonte,
                  fonte_id: emp.fonte_id,
                  nome: emp.nome,
                  papel: emp.papel,
                },
                update: { nome: emp.nome, papel: emp.papel },
              });
            }
          }
          ok++;
        } catch (e) {
          falhas++;
          if (falhas <= 5) saida(`  falha [${m.titulo}]: ${e.message}`);
        }
      }
      saida(`FIM ${g.tipo} ok=${ok} semDado=${semDado} falhas=${falhas}`);
    }
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
