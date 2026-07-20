import { z } from "zod";

/**
 * DTO de paginação cursor-based (T4.5).
 *
 * - `cursor`: ID do último item da página anterior (opaque, base64url).
 * - `limit`: itens por página (default 20, max 100).
 * - `direction`: 'forward' (próxima página) ou 'backward' (página anterior).
 *
 * Cursor-based é preferível a offset-based para:
 * - Performance: index seek em vez de OFFSET scan.
 * - Consistência: não pula/duplica itens se novos registros são inseridos
 *   entre páginas.
 * - Segurança: não revela total de registros (offset-based permite estimar).
 */
export const PaginationDto = z.object({
  cursor: z.string().max(1024).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(["forward", "backward"]).default("forward"),
});

export type PaginationDtoType = z.infer<typeof PaginationDto>;

/**
 * Resultado de paginação cursor-based.
 */
export interface PaginatedResult<T> {
  data: T[];
  next_cursor: string | null;
  previous_cursor: string | null;
  has_more: boolean;
  limit: number;
}

/**
 * Helper para construir paginação Prisma.
 *
 * Uso:
 *   const { data, next_cursor, has_more } = await paginateCursor({
 *     prisma: this.prisma,
 *     model: "midia",
 *     cursor_field: "id",
 *     params: { limit: 20, cursor: req.query.cursor, direction: "forward" },
 *     where: { tipo: "FILME" },
 *     orderBy: { created_at: "desc" },
 *   });
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- prisma model access is dynamic by design */
export async function paginateCursor<T>(params: {
  prisma: Record<string, any>;
  model: string;
  cursor_field: string;
  params: PaginationDtoType;
  where?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
  select?: Record<string, boolean>;
}): Promise<PaginatedResult<T>> {
  const { prisma, model, cursor_field, params: p, where, orderBy, select } = params;
  const limit = p.limit ?? 20;
  // Busca 1 a mais para saber se há próxima página.
  const take = p.direction === "forward" ? limit + 1 : -(limit + 1);

  const cursor = p.cursor ? { [cursor_field]: decodeCursor(p.cursor) } : undefined;

  // biome-ignore lint/suspicious/noExplicitAny: prisma model access
  const records: T[] = await (prisma[model] as any).findMany({
    where,
    orderBy,
    take,
    cursor,
    skip: cursor ? 1 : 0,
    select,
  });

  const has_more = records.length > limit;
  const data = has_more ? records.slice(0, limit) : records;
  if (p.direction === "backward") data.reverse();

  const next_cursor =
    has_more && p.direction === "forward" && data.length > 0
      ? encodeCursor((data[data.length - 1] as Record<string, unknown>)[cursor_field] as string)
      : null;

  const previous_cursor =
    p.cursor && data.length > 0
      ? encodeCursor((data[0] as Record<string, unknown>)[cursor_field] as string)
      : null;

  return {
    data,
    next_cursor,
    previous_cursor,
    has_more,
    limit,
  };
}

/**
 * Codifica valor do cursor em base64url (opaque para o cliente).
 */
export function encodeCursor(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

/**
 * Decodifica cursor base64url de volta para valor original.
 */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

/**
 * Allowlist de campos de ordenação (T4.6 do PLANO_MESTRE.md).
 * Rejeita qualquer campo não na lista.
 */
export function validateSortField(
  field: string | undefined,
  allowlist: readonly string[],
): { field: string; direction: "asc" | "desc" } | null {
  if (!field) return null;
  // Formato: "campo" ou "campo:asc" ou "campo:desc"
  const [f, d] = field.split(":");
  if (!f || !allowlist.includes(f)) return null;
  const direction = d === "desc" ? "desc" : "asc";
  return { field: f, direction };
}
