/**
 * seed-posters.ts (T226/D-240) — backfill de poster_url para games, livros,
 * quadrinhos e mangás que ficaram sem capa (cards placeholder na home).
 *
 * POLÍTICA (D-240):
 * - Só preenche poster_url quando NULL/vazio — NUNCA sobrescreve pôster
 *   existente (TMDB já cobre filmes/séries).
 * - Fontes por tipo:
 *     GAME  → IGDB cover (OAuth client-credentials Twitch; TWITCH_CLIENT_ID
 *             e TWITCH_CLIENT_SECRET do env; fonte_id é o id numérico IGDB)
 *     LIVRO → Google Books (GOOGLE_BOOKS_API_KEY) com fallback OpenLibrary
 *             covers (sem chave, por ISBN via search)
 *     MANGA → Jikan (público, sem chave; busca por título + delay)
 *     COMIC → OpenLibrary por ISBN quando houver; senão mantém placeholder
 * - Rate limit: delay ≥ 250ms entre chamadas por fonte; máx. 1 retry por
 *   título; falha → log do título e continua (nunca aborta o lote).
 * - Nenhum segredo em logs; armazena apenas a URL https final.
 * - Idempotente: re-run só atinge o que ainda está sem poster.
 *
 * Uso: npm run db:seed:posters
 */
import { PrismaClient } from "@prisma/client";
import { bootstrapRlsSeed } from "../src/common/rls-context.js";
import { logHttpErro, postApigql, obterTokenTwitch } from "./igdb-http.js";

const prisma = new PrismaClient();

const DELAY_MS = 300;
const RETRY_MAX = 1;

// T257 (ajuste de cache): a API cacheia /midias por 60s para anônimos
// (CacheService T210, chave `midias:${hash}`). Após re-seed, o catálogo
// pode servir o registro antigo (sem pôster) por até 60s. O seed NÃO
// importa src/ (standalone), então não invalida via CacheService — o TTL
// expira sozinho; para forçar revalidação imediata o Operador pode, no
// Console, rodar um segundo seed após 60s (idempotente, só-null) ou
// aguardar a expiração natural. Documentado como limitação conhecida
// (D-257).

interface Contadores {
  preenchidos: number;
  falhos: number;
  ignorados: number;
  semFonte: number;
}

const contadores: Contadores = { preenchidos: 0, falhos: 0, ignorados: 0, semFonte: 0 };

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(
  url: string,
  headers: Record<string, string> = {},
  retry = 0,
): Promise<T | null> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      // T257: surfacing do status HTTP real (D-230) — nunca engolir.
      logHttpErro("GET", url, res);
      if (retry < RETRY_MAX) {
        await delay(DELAY_MS);
        return getJson<T>(url, headers, retry + 1);
      }
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[posters] GET falhou: ${url.slice(0, 120)} (${String(err).slice(0, 120)})`);
    if (retry < RETRY_MAX) {
      await delay(DELAY_MS);
      return getJson<T>(url, headers, retry + 1);
    }
    return null;
  }
}

/** URL https válida ou null (nunca armazena http/não-imagem). */
export function urlSegura(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const u = raw.startsWith("//") ? `https:${raw}` : raw;
  if (!/^https:\/\//.test(u)) return null;
  return u;
}

// ---------- GAME: IGDB cover (OAuth Twitch client-credentials) ----------
// O cliente HTTP (postApigql/postForm/obterTokenTwitch/logHttpErro) vive em
// ./igdb-http.ts (T276/D-265) — compartilhado com seed-games e o auditor.

interface IgdbGame {
  id?: number;
  cover?: { id?: number } | number;
}

interface IgdbCover {
  id?: number;
  url?: string;
}

async function capaIgdb(gameId: string, titulo: string): Promise<string | null> {
  const token = await obterTokenTwitch();
  if (!token) {
    const temChaves = Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);
    // T236: distinguir "chaves ausentes" de "autenticação falhou" — o
    // diagnóstico anterior (warn genérico) confundia os dois casos.
    console.warn(
      temChaves
        ? `[posters] OAuth Twitch falhou para "${titulo}" (credenciais presentes, token não emitido)`
        : `[posters] sem TWITCH_CLIENT_ID/SECRET — pulando capa IGDB para "${titulo}"`,
    );
    return null;
  }
  // fonte_id é o id numérico do IGDB (seed-games grava String(igdbId)).
  if (!/^\d+$/.test(gameId)) return null;
  const headers = {
    "client-id": process.env.TWITCH_CLIENT_ID ?? "",
    "authorization": `Bearer ${token}`,
  };
  // T257: o IGDB v4 exige POST com body APGQL e retorna `cover` como ID
  // (não expande url) na query de games — a URL fica na tabela `covers`.
  // Antes usava GET (sem body) + `fields cover.url` num só passo: sempre
  // undefined → 51/51 falhos com token válido.
  const games = await postApigql<IgdbGame[]>(
    "https://api.igdb.com/v4/games",
    `fields cover; where id = ${gameId};`,
    headers,
  );
  if (!games || games.length === 0) return null;
  const cover = games[0]?.cover;
  const coverId = typeof cover === "number" ? cover : cover?.id;
  if (!coverId) return null;
  const covers = await postApigql<IgdbCover[]>(
    "https://api.igdb.com/v4/covers",
    `fields url; where id = ${coverId};`,
    headers,
  );
  const coverObj = covers?.find((c) => c.id === coverId) ?? covers?.[0];
  // O IGDB devolve '//images.igdb.com/igdb/image/upload/t_thumb/xxx.jpg'
  // (miniatura ~90px) — normaliza para t_cover_big (capa ~264x374) para os
  // cards exibirem a capa correta (D-262: imagens de games 'erradas').
  const url = coverObj?.url?.replace("t_thumb", "t_cover_big");
  return urlSegura(url);
}

// ---------- LIVRO: Google Books (com fallback OpenLibrary) ----------

interface GoogleBooksItem {
  volumeInfo?: { imageLinks?: { thumbnail?: string; smallThumbnail?: string } };
}

async function capaGoogleBooks(titulo: string, _fonteId: string): Promise<string | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY ?? "";
  if (!key) return null;
  const params = new URLSearchParams({ q: `intitle:${titulo}`, maxResults: "3" });
  const dados = await getJson<{ items?: GoogleBooksItem[] }>(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}&key=${key}`,
  );
  const item = dados?.items?.find((i) => i.volumeInfo?.imageLinks?.thumbnail);
  const thumb = item?.volumeInfo?.imageLinks?.thumbnail;
  return urlSegura(thumb);
}

// ---------- MANGA: Jikan (público, busca por título) ----------

interface JikanImages {
  webp?: { image_url?: string; large_image_url?: string };
  jpg?: { image_url?: string; large_image_url?: string };
}

interface JikanItem {
  images?: JikanImages;
  title?: string;
}

interface JikanResponse {
  data?: JikanItem[];
}

async function capaJikan(titulo: string): Promise<string | null> {
  // T255: User-Agent + retries — o Jikan (Cloudflare) responde 504 sem UA.
  const dados = await getJson<JikanResponse>(
    `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(titulo)}&limit=1`,
    { "User-Agent": "media-rate-seed/1.0" },
  );
  const item = dados?.data?.[0];
  const img = item?.images?.webp?.large_image_url ?? item?.images?.webp?.image_url;
  return urlSegura(img);
}

/**
 * T255: fallback de pôster para MANGA sem capa — busca a série/obra com o
 * MESMO título via /discover e reutiliza o poster do TMDB (ex.: mangá
 * Berserk usa o poster da série Berserk). Nunca lança.
 */
async function capaObraRelacionada(prisma: PrismaClient, titulo: string): Promise<string | null> {
  try {
    const relacionadas = await prisma.midia.findMany({
      where: { titulo: { contains: titulo, mode: "insensitive" }, imagem_url: { not: null } },
      take: 1,
      select: { imagem_url: true },
    });
    return urlSegura(relacionadas[0]?.imagem_url);
  } catch {
    return null;
  }
}

// ---------- Exportadas para teste (T226: fetch mockado por fonte) ----------

export { capaIgdb, capaGoogleBooks, capaJikan, capaOpenLibrary, capaObraRelacionada };

// ---------- COMIC/LIVRO fallback: OpenLibrary covers (sem chave) ----------

interface OpenLibraryDoc {
  cover_i?: number;
  isbn?: string[];
}

interface OpenLibraryResponse {
  docs?: OpenLibraryDoc[];
}

async function capaOpenLibrary(titulo: string): Promise<string | null> {
  const dados = await getJson<OpenLibraryResponse>(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(titulo)}&fields=cover_i,isbn&limit=1`,
  );
  const coverId = dados?.docs?.[0]?.cover_i;
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
}

// ---------- Principal ----------

async function preencher() {
  await bootstrapRlsSeed(prisma);
  // D-262: corrige URLs IGDB ja gravadas como t_thumb (miniatura) → t_cover_big.
  const comThumb = await prisma.midia.findMany({
    where: { imagem_url: { contains: "images.igdb.com", mode: "insensitive" } },
    select: { id: true, imagem_url: true },
  });
  for (const m of comThumb) {
    const novo = m.imagem_url?.replace("t_thumb", "t_cover_big");
    if (novo && novo !== m.imagem_url) {
      await prisma.midia.update({ where: { id: m.id }, data: { imagem_url: novo } });
      contadores.preenchidos++;
      console.log(`[posters] igdb thumb→cover: ${m.id}`);
    }
  }

  // Fonte de verdade: apenas midias SEM poster (imagem_url null/vazio).
  const semPoster = await prisma.midia.findMany({
    where: {
      deleted_at: null,
      OR: [{ imagem_url: null }, { imagem_url: "" }],
    },
    select: { id: true, titulo: true, tipo: true, fonte_id: true },
  });

  console.log(`[posters] ${semPoster.length} mídias sem pôster (GAME/LIVRO/COMIC/MANGA e outras)`);

  for (const m of semPoster) {
    let capa: string | null = null;
    const fonte = (m.tipo ?? "") as string;

    switch (fonte) {
      case "GAME":
        capa = await capaIgdb(m.fonte_id, m.titulo);
        break;
      case "LIVRO":
        capa = await capaGoogleBooks(m.titulo, m.fonte_id);
        if (!capa) capa = await capaOpenLibrary(m.titulo);
        break;
      case "MANGA":
        capa = await capaJikan(m.titulo);
        // T255: fallback por obra relacionada (ex.: mangá Berserk usa o
        // poster da série Berserk) quando o Jikan não retorna capa.
        if (!capa) capa = await capaObraRelacionada(prisma, m.titulo);
        break;
      case "COMIC":
        capa = await capaOpenLibrary(m.titulo);
        break;
      default:
        // FILME/SERIE já cobertos pelo TMDB — não é responsabilidade deste seed.
        contadores.semFonte++;
        continue;
    }

    if (capa) {
      await prisma.midia.update({ where: { id: m.id }, data: { imagem_url: capa } });
      contadores.preenchidos++;
      console.log(`[posters] ${m.titulo} (${fonte}) → ${capa}`);
    } else {
      contadores.falhos++;
      // T276/D-265: evidência individual do falho (id + fonte) — cada falho
      // remanescente exige justificativa (cover inexistente no IGDB).
      console.warn(`[posters] sem capa: ${m.titulo} (${fonte}, id=${m.fonte_id})`);
    }
    await delay(DELAY_MS); // rate limit por fonte
  }

  // T236: diagnóstico de presença das chaves (booleanos apenas, NUNCA
  // valores) — o check booleano do Operador provou que existem no env.
  console.log(
    `[posters] env: twitch=${Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET)} gbooks=${Boolean(process.env.GOOGLE_BOOKS_API_KEY)}`,
  );
  console.log(
    `[posters] resumo: ${contadores.preenchidos} preenchidos / ${contadores.falhos} falhos / ${contadores.semFonte} sem fonte (não-GAME/LIVRO/COMIC/MANGA)`,
  );
  // T257: cache da API expira em 60s — sem ação extra; o Operador confere
  // o pôster após a expiração natural (limitação documentada D-257).
  await prisma.$disconnect();
}

preencher().catch(async (err) => {
  console.error("[posters] erro fatal:", err);
  await prisma.$disconnect();
  process.exit(1);
});
