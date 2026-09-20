/**
 * T469/D-527 — guard de UUIDs vindos de dados legados.
 *
 * `watchlist_entry.midia_id` é VarChar(255) por design e o banco de
 * produção contém 11 linhas legadas com ids externos (TMDB ids como
 * `1083381`, slugs de gênero como `g1`) que NÃO são UUIDs. Quando esses
 * ids entram num `where: { id: { in: [...] } }` do Prisma sobre a coluna
 * `midia.id` (Uuid), o parser lança "Error creating UUID, invalid length:
 * expected length 32 for simple format, found 7" → 500 no /premium/graph
 * (issue Sentry MEDIA-RATE-3, 4 semanas).
 *
 * O guard filtra a entrada para UUIDs canônicos antes do `in` — o
 * endpoint nunca mais explode por dado legado.
 *
 * Ref: issue Sentry MEDIA-RATE-3 (PrismaClientKnownRequestError em
 * GET /api/v1/premium/graph, ongoing 4 semanas antes do guard).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Filtra apenas UUIDs canônicos (36 chars hifenizados). */
export function soUuids(ids: readonly string[]): string[] {
  return ids.filter((id) => UUID_RE.test(id));
}
