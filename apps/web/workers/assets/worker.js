/**
 * T454/D-495 — Worker de assets na frente do R2.
 *
 * Serve `media/{tipo}/{midiaId}/{sha256}.{ext}` do bucket com:
 * - Cache-Control imutável (chave content-addressed: mesmo sha = mesmo
 *   conteúdo, então o cache pode viver 1 ano sem risco de staleness);
 * - content-type correto (metadados gravados no objeto no upload);
 * - sem listagem de bucket (só GET/HEAD de chave exata; 405 nos demais).
 *
 * Deploy (Operador, com token escopado):
 *   cd workers/assets && npx wrangler deploy
 * Rota pública: cdn.mediarate.app (CNAME — fase final da migração de zona;
 * até lá o acesso público segue pela URL/CDN configurada no Railway).
 *
 * Globals (Request/Response/Headers/URL) e tipos R2 são do runtime
 * Cloudflare Workers — ver @cloudflare/workers-types quando houver TS.
 */

const CACHE_CONTROL = "public, max-age=31536000, immutable";

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, {
        status: 405,
        headers: { "Allow": "GET, HEAD", "Cache-Control": "no-store" },
      });
    }

    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.slice(1));
    // Sem listagem: chave vazia, com barra final ou com query de listagem → 404.
    if (key === "" || key.endsWith("/")) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const objeto = await env.ASSETS_BUCKET.get(key);
    if (!objeto) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const headers = new Headers();
    objeto.writeHttpMetadata(headers);
    headers.set("etag", objeto.httpEtag);
    headers.set("Cache-Control", CACHE_CONTROL);

    return new Response(request.method === "HEAD" ? null : objeto.body, { headers });
  },
};
