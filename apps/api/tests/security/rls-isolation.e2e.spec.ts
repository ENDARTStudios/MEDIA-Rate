import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * T290 (D-284) — teste de ISOLAMENTO RLS (gate de segurança §10 / T294).
 * Requer DATABASE_URL_RLS_TEST (postgres service no CI: migrate deploy em DB
 * virgem). Sem a env, o teste SKIPPA.
 *
 * T303: o spec roda num papel NAO-superuser (mediarate_rls_app, criado no
 * beforeAll) — a conexao default (postgres) tem BYPASSRLS e nao testaria nada.
 */
const URL_RLS = process.env.DATABASE_URL_RLS_TEST ?? "";

const describeComDb = URL_RLS ? describe : describe.skip;

const TENANT = "00000000-0000-0000-0000-000000000001";
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
// T303: a conexao e superuser (postgres) e BYPASSRLS — o teste precisa rodar
// as queries como um papel NAO-superuser para o RLS aplicar.
const APP_ROLE = "mediarate_rls_app";

describeComDb("T290 — isolamento RLS A≠B (usuário de aplicação não-superuser)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: URL_RLS });
    // Cria papel de aplicacao nao-superuser (idempotente) e concede privilegios.
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${APP_ROLE}') THEN
          CREATE ROLE ${APP_ROLE};
        END IF;
      END $$;
    `);
    await prisma.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON watchlist_entry, discovery_event TO ${APP_ROLE}`,
    );

    // Limpa fixtures. T303: watchlist_entry tem FK usuario_id -> usuario e
    // midia_id NOT NULL; o fixture precisa criar o usuario A antes.
    await prisma.$executeRawUnsafe(`DELETE FROM watchlist_entry`);
    await prisma.$executeRawUnsafe(`DELETE FROM usuario WHERE id IN ('${A}','${B}')`);
    await prisma.$executeRawUnsafe(
      `INSERT INTO usuario (id, email, password_hash, created_at, updated_at) VALUES ('${A}','rls-a@test.com','hash', now(), now())`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO watchlist_entry (id, usuario_id, midia_id, tenant_id) VALUES ('${A}','${A}','midia-${A}','${TENANT}')`,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("usuário B NÃO vê a entry de A (0 linhas)", async () => {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET ROLE ${APP_ROLE}`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id','${B}',false)`);
      return tx.$queryRawUnsafe(`SELECT count(*)::int AS c FROM watchlist_entry`);
    });
    expect(rows[0].c).toBe(0);
  });

  it("usuário B NÃO atualiza a entry de A (0 linhas afetadas)", async () => {
    const affected = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET ROLE ${APP_ROLE}`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id','${B}',false)`);
      return tx.$executeRawUnsafe(`UPDATE watchlist_entry SET tenant_id = tenant_id`);
    });
    expect(affected).toBe(0);
  });

  it("usuário A vê a própria entry (1 linha)", async () => {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET ROLE ${APP_ROLE}`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id','${A}',false)`);
      return tx.$queryRawUnsafe(`SELECT count(*)::int AS c FROM watchlist_entry`);
    });
    expect(rows[0].c).toBe(1);
  });
});
