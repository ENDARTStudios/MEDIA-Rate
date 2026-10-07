#!/usr/bin/env node
/**
 * T172 (Onda D3) — mangás (Kitsu, top por userCount) e livros (OpenLibrary,
 * top por readinglog COM rating agregado do work). Mangá: averageRating do
 * Kitsu é percentual 0-100 (display vira /10 pelo pipeline). Livro: summary
 * do ratings agregado → media_score (fonte "openlibrary_publico"); sem
 * rating → catálogo honesto sem score. Existentes pulados; DRY_RUN default.
 */
import { request as httpsRequest } from "node:https";

const UA = "MEDIA-Rate/0.1 (beta; catalogo; mediarate.app)";

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

export function slugify(titulo) {
  return String(titulo ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 240);
}

/** Kitsu attrs → linha de mídia (averageRating percentual 0-100). */
export function mapearKitsu(attrs, id) {
  const nota = attrs.averageRating != null ? Number.parseFloat(attrs.averageRating) : null;
  const ano = attrs.startDate ? Number.parseInt(attrs.startDate.slice(0, 4), 10) : null;
  return {
    fonte: "kitsu",
    fonte_id: String(id),
    titulo: attrs.canonicalTitle ?? attrs.titles?.en ?? attrs.titles?.en_jp ?? "",
    sinopse: attrs.synopsis && attrs.synopsis.trim() ? attrs.synopsis.trim() : null,
    ano_lancamento: Number.isFinite(ano) ? ano : null,
    imagem_url: attrs.posterImage?.medium ?? attrs.posterImage?.tiny ?? null,
    score:
      nota != null && Number.isFinite(nota) && nota > 0
        ? Math.min(100, Math.round(nota * 10) / 10)
        : null,
    votos: attrs.userCount ?? 0,
  };
}

/** OpenLibrary doc + ratings agregados → linha de mídia. */
export function mapearOpenlibrary(doc, ratings) {
  const nota = ratings?.summary?.average ?? null;
  return {
    fonte: "openlibrary",
    fonte_id: String(doc.key ?? "").replace("/works/", ""),
    titulo: doc.title ?? "",
    sinopse: null, // description vem no detail; fase 1 sem request extra
    ano_lancamento: Array.isArray(doc.first_publish_year)
      ? doc.first_publish_year[0]
      : (doc.first_publish_year ?? null),
    imagem_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    score:
      nota != null && Number.isFinite(nota) && nota > 0
        ? Math.min(100, Math.round(nota * 10) / 10)
        : null,
    votos: ratings?.summary?.count ?? 0,
  };
}

/** Slugs únicos (Set mutado, sufixo do tipo — mesma semântica D1/D2). */
export function resolverSlugs(candidatos, ocupadosSet, sufixo) {
  const ocupados = ocupadosSet instanceof Set ? ocupadosSet : new Set(ocupadosSet);
  const saida = [];
  for (const c of candidatos) {
    const base = slugify(c.titulo) || c.fonte_id;
    let slug = base;
    if (ocupados.has(slug)) {
      slug = `${base}-${sufixo}`;
      let n = 2;
      while (ocupados.has(slug)) {
        slug = `${base}-${sufixo}-${n}`;
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

async function criarMidia(prisma, m, tipo, statsEscala) {
  const criada = await prisma.midia.create({
    data: {
      fonte: m.fonte,
      fonte_id: m.fonte_id,
      tipo,
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
        fonte: statsEscala.fonte,
        rating: m.score,
        media_fonte: statsEscala.media,
        desvio_fonte: statsEscala.desvio,
        votos: m.votos,
        url: m.url ?? null,
      },
    });
  }
  return criada;
}

async function main() {
  const dryRun = process.env.DRY_RUN !== "0";
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const existentes = new Set(
      (
        await prisma.midia.findMany({
          where: { fonte: { in: ["kitsu", "openlibrary"] } },
          select: { fonte: true, fonte_id: true },
        })
      ).map((m) => `${m.fonte}::${m.fonte_id}`),
    );
    const slugsOcupados = new Set(
      (await prisma.midia.findMany({ select: { slug: true } })).map((m) => m.slug).filter(Boolean),
    );

    // ---- MANGÁS (Kitsu, top 500 por userCount) ----
    let mangas = [];
    for (let offset = 0; offset < 500; offset += 20) {
      await esperar(400);
      try {
        const j = await httpJson(
          `https://kitsu.io/api/edge/manga?page[limit]=20&page[offset]=${offset}&sort=-userCount`,
        );
        const data = j?.data ?? [];
        mangas = mangas.concat(data);
        if (data.length < 20) break;
      } catch (e) {
        saida(`  kitsu offset ${offset}: ${e.message}`);
      }
    }
    const candidatosManga = mangas
      .map((d) => mapearKitsu(d.attributes ?? {}, d.id))
      .filter((m) => m.titulo && !existentes.has(`${m.fonte}::${m.fonte_id}`));
    const comSlugManga = resolverSlugs(candidatosManga, slugsOcupados, "manga");
    let criadosManga = 0;
    let falhasManga = 0;
    for (const m of comSlugManga) {
      existentes.add(`${m.fonte}::${m.fonte_id}`);
      if (dryRun) continue;
      try {
        await criarMidia(prisma, m, "MANGA", { fonte: "kitsu_publico", media: 60, desvio: 15 });
        criadosManga++;
      } catch (e) {
        falhasManga++;
        if (falhasManga <= 5) saida(`  falha manga [${m.titulo}]: ${e.message?.slice(0, 100)}`);
      }
    }
    saida(
      `MANGA ${dryRun ? "(dry) " : ""}${criadosManga} falhas=${falhasManga} (candidatos ${candidatosManga.length})`,
    );

    // ---- LIVROS (OpenLibrary, top 600 por readinglog COM rating) ----
    let livros = [];
    for (const pagina of [1, 2, 3]) {
      await esperar(700);
      try {
        const j = await httpJson(
          `https://openlibrary.org/search.json?q=subject%3Afiction&sort=readinglog&fields=key,title,first_publish_year,cover_i,ratings_count&limit=200&page=${pagina}`,
        );
        livros = livros.concat(j?.docs ?? []);
      } catch (e) {
        saida(`  ol página ${pagina}: ${e.message}`);
      }
    }
    const candidatosLivro = livros
      .filter((d) => d.key && (d.ratings_count ?? 0) > 0)
      .map((d) => mapearOpenlibrary(d, { summary: { average: null, count: d.ratings_count } }))
      .filter((m) => m.titulo && !existentes.has(`${m.fonte}::${m.fonte_id}`));
    const comSlugLivro = resolverSlugs(candidatosLivro, slugsOcupados, "livro");
    let criadosLivro = 0;
    let falhasLivro = 0;
    for (const m of comSlugLivro) {
      existentes.add(`${m.fonte}::${m.fonte_id}`);
      if (dryRun) continue;
      try {
        await criarMidia(prisma, { ...m, score: null, votos: 0 }, "LIVRO", {
          fonte: "openlibrary_publico",
          media: 70,
          desvio: 15,
        });
        criadosLivro++;
      } catch (e) {
        falhasLivro++;
        if (falhasLivro <= 5) saida(`  falha livro [${m.titulo}]: ${e.message?.slice(0, 100)}`);
      }
    }
    saida(
      `LIVRO ${dryRun ? "(dry) " : ""}${criadosLivro} falhas=${falhasLivro} (candidatos ${candidatosLivro.length})`,
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
