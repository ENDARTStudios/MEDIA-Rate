/**
 * image-policy (T032/D-445) — fonte única de verdade sobre quais fontes de
 * imagem bytem o otimizador (`unoptimized`).
 *
 * Pôsteres desses hosts externos retornavam 402 do otimizador Vercel no
 * limite do plano — servir direto da origem elimina a transformação.
 * Mesma lista da regex que vivia inline no MediaCardShell.
 */
const UNOPTIMIZED_HOSTS = [
  "anilist",
  "openlibrary",
  "myanimelist",
  "comicvine",
  "googlebooks",
  // T036: gap do TDD de T032 — capas reais do Google Books usam
  // books.google.com/books/content (sem o substring "googlebooks").
  "books.google",
];

export function isUnoptimizedSource(src: string | null | undefined): boolean {
  if (!src) return false;
  const lower = src.toLowerCase();
  return UNOPTIMIZED_HOSTS.some((host) => lower.includes(host));
}

/**
 * T031 — imagens locais (uploads próprios, `/uploads/media/...`).
 * Servidas estáticas pelo backend com ladder fixa (ver `nomeVariante` em
 * apps/api/src/modules/upload/variants.ts) — zero transformação runtime.
 */
export function isLocalSource(src: string | null | undefined): boolean {
  return !!src && src.startsWith("/") && !src.startsWith("//");
}

const LOCAL_WIDTHS = [320, 640, 960] as const;

/** `/uploads/media/<id>/<uuid>.jpg` → srcset das 3 variantes WebP. */
export function localSrcSet(src: string): string {
  const base = src.replace(/\.[a-z0-9]+$/i, "");
  return LOCAL_WIDTHS.map((w) => `${base}-w${w}.webp ${w}w`).join(", ");
}

/**
 * T447/D-441 — variante ÚNICA de display (card 300px): um poster, uma URL,
 * zero srcset. Cada candidato a mais no srcset é uma transformação potencial
 * por região no plano Hobby — com 72 pôsteres na home, o srcset multi-rung
 * vira milhares de transformações por varredura global.
 *
 * Escolhe o menor rung >= alvo (sem upscale visual); se nenhum rung cobre o
 * alvo, usa o maior disponível. Retorna null quando não há ladder (o
 * componente usa o fallback `unoptimized`).
 */
export function displaySrc(src: string | null | undefined, targetWidth = 300): string | null {
  if (!src) return null;
  const ladder = isLocalSource(src) ? localSrcSet(src) : (remoteLadder(src)?.srcSet ?? null);
  if (!ladder) return null;
  let best: string | null = null;
  for (const candidate of ladder.split(",")) {
    const [url, descriptor] = candidate.trim().split(/\s+/);
    if (!url) continue;
    best ??= url;
    const width = Number.parseInt(descriptor ?? "", 10);
    if (Number.isFinite(width) && width >= targetWidth) return url;
    best = url;
  }
  return best;
}

export interface RemoteLadder {
  src: string;
  srcSet: string;
}

/**
 * T036/D-447 — ladder nativa da fonte remota (derivação por padrão de URL,
 * zero fetch). Retorna null quando a fonte não tem escada pública (nesse
 * caso o componente usa `next/image` com `unoptimized` — fallback sem
 * transformação) ou quando a fonte é local (ladder de T031).
 *
 * Larguras TMDB/IGDB são exatas (documentadas); OpenLibrary/Google Books
 * são nominais com ordem correta (S<M<L, zoom0<zoom1) — o suficiente para
 * o browser escolher o rung; a meta zero-transformação independe delas.
 */
export function remoteLadder(src: string | null | undefined): RemoteLadder | null {
  if (!src || isLocalSource(src)) return null;

  // TMDB: /t/p/{w342|w780|original}/… (seed-tmdb usa w500, seed-temporadas w300).
  const tmdb = src.match(/^(https:\/\/image\.tmdb\.org\/t\/p\/)(w\d+|original)(\/.*)$/i);
  if (tmdb) {
    const head = tmdb[1];
    const tail = tmdb[3];
    return {
      src: `${head}original${tail}`,
      srcSet: `${head}w342${tail} 342w, ${head}w780${tail} 780w`,
    };
  }

  // IGDB: /upload/{size}/… — cover_small 90, cover_big 264, cover_big_2x 528
  // (documentados; normalizar-imagem/D-262 já mira t_cover_big).
  const igdb = src.match(
    /^(https:\/\/images\.igdb\.com\/igdb\/image\/upload\/)(t_[A-Za-z0-9_]+)(\/.*)$/i,
  );
  if (igdb) {
    const head = igdb[1];
    const tail = igdb[3];
    return {
      src: `${head}t_cover_big_2x${tail}`,
      srcSet:
        `${head}t_cover_small${tail} 90w, ` +
        `${head}t_cover_big${tail} 264w, ` +
        `${head}t_cover_big_2x${tail} 528w`,
    };
  }

  // OpenLibrary: …-{S|M|L}.jpg (seed-posters/seed-fase-c-enrich).
  const ol = src.match(/^(https:\/\/covers\.openlibrary\.org\/.*)-(S|M|L)(\.[A-Za-z0-9]+)$/i);
  if (ol) {
    const head = ol[1];
    const tail = ol[3];
    return {
      src: `${head}-L${tail}`,
      srcSet: `${head}-S${tail} 128w, ${head}-M${tail} 256w, ${head}-L${tail} 512w`,
    };
  }

  // Google Books: books.google.com/books/content com zoom (seed-posters usa
  // o thumbnail da API, já com zoom=1). Reescreve o zoom preservando a query.
  if (/books\.google\.com\/books\/content/i.test(src)) {
    const semZoom = src
      .replace(/[?&]zoom=\d+/i, "")
      .replace("?&", "?")
      .replace(/[?&]$/, "");
    const sep = semZoom.includes("?") ? "&" : "?";
    return {
      src,
      srcSet: `${semZoom}${sep}zoom=0 128w, ${semZoom}${sep}zoom=1 512w`,
    };
  }

  return null;
}
