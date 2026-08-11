import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * T290 (D-284) — teste de ISOLAMENTO RLS (gate de segurança §10 / T294).
 * Requer DATABASE_URL_RLS_TEST (ex.: docker postgres com a migration RLS
 * aplicada). Sem a env, o teste SKIPPA (CI sem banco RLS dedicado).
 *
 * O drill docker completo (habilitar → isolar → rollback) é documentado em
 * apps/api/docs/ROLLBACK_RLS.md e foi executado manualmente em 2026-08-11.
 */
const URL_RLS = process.env.DATABASE_URL_RLS_TEST ?? "";

const describeComDb = URL_RLS ? describe : describe.skip;

const TENANT = "00000000-0000-0000-0000-000000000001";
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";

describeComDb("T290 — isolamento RLS A≠B (usuário de aplicação não-superuser)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: URL_RLS });
    // Limpa e insere entry de A via ADMIN (superuser nao passa pelo RLS).
    await prisma.$executeRawUnsafe(`DELETE FROM watchlist_entry`);
    await prisma.$executeRawUnsafe(
      `INSERT INTO watchlist_entry (id, usuario_id, tenant_id) VALUES ('${A}','${A}','${TENANT}')`,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("usuário B NÃO vê a entry de A (0 linhas)", async () => {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT set_config('app.current_user_id', '${B}', false); SELECT count(*)::int AS c FROM watchlist_entry;`,
    );
    expect(rows[0].c).toBe(0);
  });

  it("usuário B NÃO atualiza a entry de A (0 linhas afetadas)", async () => {
    const affected = await prisma.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', '${B}', false); UPDATE watchlist_entry SET tenant_id = tenant_id;`,
    );
    expect(affected).toBe(0);
  });

  it("usuário A vê a própria entry (1 linha)", async () => {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT set_config('app.current_user_id', '${A}', false); SELECT count(*)::int AS c FROM watchlist_entry;`,
    );
    expect(rows[0].c).toBe(1);
  });
});
