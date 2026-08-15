import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * T345 — isolamento RLS A≠B em usuario_plano (FORCE RLS, T344).
 * Requer DATABASE_URL_RLS_TEST (postgres service com migrate deploy). Sem a
 * env, o teste SKIPPA (mesmo padrão do rls-isolation.e2e.spec.ts).
 *
 * Roda num papel NÃO-superuser (mediarate_rls_app) — a conexão default é
 * superuser com BYPASSRLS e não testaria nada.
 */
const URL_RLS = process.env.DATABASE_URL_RLS_TEST ?? "";
const describeComDb = URL_RLS ? describe : describe.skip;

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const APP_ROLE = "mediarate_rls_app";

describeComDb("T345 — isolamento RLS A≠B em usuario_plano (owner/SERVICE/ADMIN)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: URL_RLS });
    // Papel de aplicação não-superuser (idempotente) + grant em usuario_plano.
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${APP_ROLE}') THEN
          CREATE ROLE ${APP_ROLE};
        END IF;
      END $$;
    `);
    await prisma.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON usuario_plano TO ${APP_ROLE}`,
    );

    // Fixtures (conexão superuser — BYPASSRLS, sem SET ROLE).
    await prisma.$executeRawUnsafe(`DELETE FROM usuario_plano WHERE usuario_id IN ('${A}','${B}')`);
    await prisma.$executeRawUnsafe(`DELETE FROM usuario WHERE id IN ('${A}','${B}')`);
    await prisma.$executeRawUnsafe(
      `INSERT INTO usuario (id, email, password_hash, created_at, updated_at) VALUES ('${A}','plano-a@test.com','hash', now(), now())`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO usuario (id, email, password_hash, created_at, updated_at) VALUES ('${B}','plano-b@test.com','hash', now(), now())`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO usuario_plano (usuario_id, plano, status, created_at, updated_at) VALUES ('${A}','PLUS','ATIVA', now(), now())`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO usuario_plano (usuario_id, plano, status, created_at, updated_at) VALUES ('${B}','FREE','ATIVA', now(), now())`,
    );
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM usuario_plano WHERE usuario_id IN ('${A}','${B}')`);
    await prisma.$executeRawUnsafe(`DELETE FROM usuario WHERE id IN ('${A}','${B}')`);
    await prisma.$disconnect();
  });

  it("usuário A lê o PRÓPRIO plano (owner)", async () => {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${APP_ROLE}`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id','${A}',true)`);
      return tx.$queryRawUnsafe(
        `SELECT plano::text AS plano FROM usuario_plano WHERE usuario_id = '${A}'`,
      );
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].plano).toBe("PLUS");
  });

  it("usuário A NÃO lê o plano de B (cross-user bloqueado)", async () => {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${APP_ROLE}`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id','${A}',true)`);
      return tx.$queryRawUnsafe(
        `SELECT plano::text AS plano FROM usuario_plano WHERE usuario_id = '${B}'`,
      );
    });
    expect(rows).toHaveLength(0);
  });

  it("usuário A NÃO atualiza o plano de B (owner-only write)", async () => {
    const affected = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${APP_ROLE}`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id','${A}',true)`);
      return tx.$executeRawUnsafe(
        `UPDATE usuario_plano SET status = 'CANCELADA' WHERE usuario_id = '${B}'`,
      );
    });
    expect(affected).toBe(0);
  });

  it("SERVICE atualiza o plano de B (webhook billing)", async () => {
    const affected = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${APP_ROLE}`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id','${B}',true)`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_role','SERVICE',true)`);
      return tx.$executeRawUnsafe(
        `UPDATE usuario_plano SET status = 'CANCELADA' WHERE usuario_id = '${B}'`,
      );
    });
    expect(affected).toBe(1);
  });

  it("ADMIN lê todos os planos (stats)", async () => {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${APP_ROLE}`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_role','ADMIN',true)`);
      return tx.$queryRawUnsafe(
        `SELECT count(*)::int AS c FROM usuario_plano WHERE usuario_id IN ('${A}','${B}')`,
      );
    });
    expect(rows[0].c).toBe(2);
  });
});
