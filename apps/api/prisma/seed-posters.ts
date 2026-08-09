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

const prisma = new PrismaClient();

const DELAY_MS = 300;
const RETRY_MAX = 1;

interface Contadores {
  preenchidos: number;
  falhos: number;
  ignorados: number;
  semFonte: number;
}

const contadores: Contadores = { preenchidos: 0, falhos: 0, ignorados: 0, semFonte: 0 };

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string, headers: Record<string, string> = {}, retry = 0): Promise<T | null> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (retry < RETRY_MAX) {
        await delay(DELAY_MS);
        return getJson<T>(url, headers, retry + 1);
      }
      return null;
    }
    return (await res.json()) as T;
  } catch {
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

interface TokenTwitch {
  access_token?: string;
  expires_in?: number;
}

let tokenTwitch: { token: string; expiraEm: number } | null = null;

async function obterTokenTwitch(): Promise<string | null> {
  if (tokenTwitch && Date.now() < tokenTwitch.expiraEm) return tokenTwitch.token;
  const clientId = process.env.TWITCH_CLIENT_ID ?? "";
  const secret = process.env.TWITCH_CLIENT_SECRET ?? "";
  if (!clientId || !secret) return null;
  const corpo = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    grant_type: "client_credentials",
  });
  const dados = await getJson<TokenTwitch>("https://id.twitch.tv/oauth2/token", {
    "content-type": "application/x-www-form-urlencoded",
  });
  if (!dados?.access_token) return null;
  tokenTwitch = { token: dados.access_token, expiraEm: Date.now() + (dados.expires_in ?? 3600) * 1000 };
  return dados.access_token;
}

interface IgdbGame {
  id?: number;
  cover?: { url?: string };
}

async function capaIgdb(gameId: string, titulo: string): Promise<string | null> {
  const token = await obterTokenTwitch();
  if (!token) {
    console.warn(`[posters] sem TWITCH_CLIENT_ID/SECRET — pulando capa IGDB para "${titulo}"`);
    return null;
  }
  // fonte_id é o id numérico do IGDB (seed-games grava String(igdbId)).
  if (!/^\d+$/.test(gameId)) return null;
  const corpo = `fields cover.url; where id = ${gameId};`;
  const dados = await getJson<IgdbGame[]>("https://api.igdb.com/v4/games", {
    "client-id": process.env.TWITCH_CLIENT_ID ?? "",
    authorization: `Bearer ${token}`,
    "content-type": "text/plain",
  });
  const cover = dados?.[0]?.cover?.url;
  return urlSegura(cover);
}

// ---------- LIVRO: Google Books (com fallback OpenLibrary) ----------

interface GoogleBooksItem {
  volumeInfo?: { imageLinks?: { thumbnail?: string; smallThumbnail?: string } };
}

async function capaGoogleBooks(titulo: string, fonteId: string): Promise<string | null> {
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
  const dados = await getJson<JikanResponse>(
    `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(titulo)}&limit=1`,
  );
  const item = dados?.data?.[0];
  const img = item?.images?.webp?.large_image_url ?? item?.images?.webp?.image_url;
  return urlSegura(img);
}

// ---------- Exportadas para teste (T226: fetch mockado por fonte) ----------

export { capaIgdb, capaGoogleBooks, capaJikan, capaOpenLibrary };

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
      console.warn(`[posters] sem capa: ${m.titulo} (${fonte})`);
    }
    await delay(DELAY_MS); // rate limit por fonte
  }

  console.log(
    `[posters] resumo: ${contadores.preenchidos} preenchidos / ${contadores.falhos} falhos / ${contadores.semFonte} sem fonte (não-GAME/LIVRO/COMIC/MANGA)`,
  );
  await prisma.$disconnect();
}

preencher().catch(async (err) => {
  console.error("[posters] erro fatal:", err);
  await prisma.$disconnect();
  process.exit(1);
});
