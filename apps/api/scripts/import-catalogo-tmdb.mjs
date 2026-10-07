#!/usr/bin/env node
/**
 * T170 (Onda D1) — importação do catálogo em ESCALA via TMDB /discover.
 *
 * Público-alvo da fase 1: filmes e séries QUALIFICADOS (nota >= 6, >= 300
 * votos) — obras reconhecíveis, é o que descobrimento precisa. Probe em
 * produção: 9.158 filmes + 1.818 séries.
 *
 * Por título a listagem já traz: título pt-BR, título original, sinopse,
 * ano, pôster e nota/votos — SEM request por título. Escreve:
 * - midia (fonte tmdb/tmdb_tv; EXISTENTES são pulados — curadoria intocada);
 * - media_score (nota do TMDB como fonte de PÚBLICO: score = vote*10,
 *   prior Bayesiano do v3 desconta a amostra);
 * - avaliacao_fonte (auditoria da nota).
 * Idempotente; DRY_RUN=1 default; node:https sem globals.
 */
import { request as httpsRequest } from "node:https";

const UA = "MEDIA-Rate/0.1 (beta; catalogo; mediarate.app)";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w780";
const PAUSA_PAGINA_MS = 250;
const TIPO_CONF = {
  FILME: { endpoint: "movie", fonte: "tmdb", sufixo: "filme" },
  SERIE: { endpoint: "tv", fonte: "tmdb_tv", sufixo: "serie" },
};

function httpJson(url) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, { headers: { "User-Agent": UA } }, (res) => {
      let dados = "";
      res.on("data", (c) => (dados += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(dados));
        } catch {
          reject(new Error(`JSON inválido (${res.statusCode})`));
        }
      });
    });
    req.setTimeout(30000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

const esperar = (ms) =>
  new Promise((r) => {
    import("node:timers").then(({ setTimeout: t }) => t(r, ms));
  });

/** Slug canônico (mesma regra do slug-service: minúsculo, sem acento, dashes). */
export function slugify(titulo) {
  return String(titulo ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 240);
}

/**
 * Puro (testado): resultado do discover → linha de mídia + score.
 * Sem overview/pôster não bloqueia; nota 0 não vira score.
 */
export function mapearResultado(r, tipo) {
  const conf = TIPO_CONF[tipo];
  const ano = Number.parseInt((r.release_date ?? r.first_air_date ?? "").slice(0, 4), 10);
  const nota = Number(r.vote_average ?? 0);
  return {
    fonte: conf.fonte,
    fonte_id: String(r.id),
    titulo: r.title ?? r.name ?? "",
    titulo_original: r.original_title ?? r.original_name ?? null,
    sinopse: r.overview && r.overview.trim() ? r.overview.trim() : null,
    ano_lancamento: Number.isFinite(ano) ? ano : null,
    imagem_url: r.poster_path ? `${IMG}${r.poster_path}` : null,
    score: nota > 0 ? Math.min(100, Math.round(nota * 10 * 10) / 10) : null,
    votos: Number.isFinite(r.vote_count) ? r.vote_count : 0,
    url: `https://www.themoviedb.org/${conf.endpoint}/${r.id}`,
  };
}

/**
 * Puro (testado): resolve slugs únicos contra os existentes e dentro do
 * próprio lote — colisão ganha sufixo do tipo ("duna-filme"), persistindo
 * com numérico se preciso ("duna-filme-2"). Convenção T398/T251.
 */
export function resolverSlugs(candidatos, slugsExistentes) {
  // Set recebido é MUTADO (persiste entre páginas do import) — array é
  // copiado apenas na primeira chamada.
  const ocupados = slugsExistentes instanceof Set ? slugsExistentes : new Set(slugsExistentes);
  const saida = [];
  for (const c of candidatos) {
    const base = slugify(c.titulo) || c.fonte_id;
    let slug = base;
    if (ocupados.has(slug)) {
      slug = `${base}-${TIPO_CONF[c.tipo].sufixo}`;
      let n = 2;
      while (ocupados.has(slug)) {
        slug = `${base}-${TIPO_CONF[c.tipo].sufixo}-${n}`;
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

// T173/D-574: guard de disco — aborta antes de escrever se o volume do
// Postgres estiver acima de 85% (lição do incidente D-574).
async function guardaDisco(prisma) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT pg_database_size(current_database())::bigint AS bytes`,
  );
  const usadosMb = Number(r[0].bytes) / 1048576;
  // Volume 5GB; folga configurável por env.
  const limiteMb = Number(process.env.DISCO_LIMITE_MB ?? 4250);
  if (usadosMb > limiteMb) {
    saida(
      `ERRO: banco com ${Math.round(usadosMb)}MB — acima do limite ${limiteMb}MB (D-574). Libere espaço e rode de novo.`,
    );
    process.exit(1);
  }
  saida(`DISCO OK ${Math.round(usadosMb)}MB / ${limiteMb}MB`);
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
    await guardaDisco(prisma);
    const existentes = new Set(
      (
        await prisma.midia.findMany({
          where: { fonte: { in: ["tmdb", "tmdb_tv"] } },
          select: { fonte: true, fonte_id: true },
        })
      ).map((m) => `${m.fonte}::${m.fonte_id}`),
    );
    // Set MUTADO pelo resolverSlugs — slugs criados no import persistem
    // entre páginas (causa raiz do abort da primeira execução).
    const slugsOcupados = new Set(
      (await prisma.midia.findMany({ select: { slug: true } })).map((m) => m.slug).filter(Boolean),
    );

    for (const [tipo, conf] of Object.entries(TIPO_CONF)) {
      const urlBase = `${TMDB_BASE}/discover/${conf.endpoint}?api_key=${chave}&language=pt-BR&vote_average.gte=6&vote_count.gte=300&include_adult=false&sort_by=popularity.desc`;
      const primeira = await httpJson(`${urlBase}&page=1`);
      const paginas = Math.min(primeira.total_pages ?? 1, 500);
      saida(`ALVO ${tipo}: ${primeira.total_results} títulos em ${paginas} páginas`);
      let importados = 0;
      let pulados = 0;
      let falhas = 0;
      for (let pag = 1; pag <= paginas; pag++) {
        const lista = pag === 1 ? primeira : await httpJson(`${urlBase}&page=${pag}`);
        const novos = [];
        for (const r of lista.results ?? []) {
          const m = mapearResultado(r, tipo);
          if (!m.titulo || existentes.has(`${m.fonte}::${m.fonte_id}`)) {
            pulados++;
            continue;
          }
          existentes.add(`${m.fonte}::${m.fonte_id}`);
          novos.push({ ...m, tipo });
        }
        // Slugs resolvidos por página (contra existentes + páginas anteriores)
        if (novos.length && !dryRun) {
          const comSlug = resolverSlugs(novos, slugsOcupados);
          for (const m of comSlug) {
            try {
              const criada = await prisma.midia.create({
                data: {
                  fonte: m.fonte,
                  fonte_id: m.fonte_id,
                  tipo,
                  titulo: m.titulo,
                  titulo_original: m.titulo_original,
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
                // escala 0-10 do TMDB (média/desvio de referência)
                await prisma.avaliacaoFonte.create({
                  data: {
                    midia_id: criada.id,
                    fonte: "tmdb",
                    rating: m.score / 10,
                    media_fonte: 7.0,
                    desvio_fonte: 1.5,
                    votos: m.votos,
                    url: m.url,
                  },
                });
              }
              importados++;
            } catch (e) {
              falhas++;
              if (falhas <= 5) saida(`  falha [${m.titulo}]: ${e.message?.slice(0, 120)}`);
            }
          }
        } else {
          importados += novos.length;
        }
        if (pag % 50 === 0) saida(`  ...${tipo} página ${pag}/${paginas}`);
        await esperar(PAUSA_PAGINA_MS);
      }
      saida(
        `FIM ${tipo} importados=${dryRun ? "(dry) " : ""}${importados} pulados_existentes=${pulados}`,
      );
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
