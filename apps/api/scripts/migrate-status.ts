// Script que simula `prisma migrate status` usando pglite (PostgreSQL WASM).
// Aplica a migration inicial em memoria e reporta o status equivalente.
//
// Justificativa: o ambiente do Doer nao tem Docker nem PostgreSQL local
// (Restricao #10: sandbox). Para validar T2.8 sem banco externo, usamos
// pglite que e PostgreSQL real rodando em WASM (gratis, sem servico
// externo, atende Restricao #1 do PROTOCOLO_MESTRE.md).
/* eslint-disable no-console */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "../prisma/migrations");

async function main(): Promise<void> {
  console.log("[migrate-status] Simulating `prisma migrate status` via pglite");
  console.log(`[migrate-status] Migrations dir: ${migrationsDir}`);

  const migrationDirs = readdirSync(migrationsDir).filter((d) => !d.startsWith("."));
  console.log(`[migrate-status] Found ${migrationDirs.length} migration(s):`);
  for (const dir of migrationDirs) {
    console.log(`  - ${dir}`);
  }

  const db = new PGlite();
  console.log("[migrate-status] PGlite instance created (in-memory)");

  // Cria tabela _prisma_migrations (simula o que Prisma faria).
  await db.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    );
  `);

  // Aplica cada migration na ordem.
  let applied = 0;
  for (const dir of migrationDirs) {
    const migrationPath = resolve(migrationsDir, dir, "migration.sql");
    const sql = readFileSync(migrationPath, "utf8");
    console.log(`[migrate-status] Applying ${dir} (${sql.length} bytes)...`);
    try {
      await db.exec(sql);
      await db.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
         VALUES ($1, $2, now(), $3, now(), 1)`,
        [crypto.randomUUID(), "simulated-checksum", dir],
      );
      applied++;
      console.log(`[migrate-status]   Applied ${dir}`);
    } catch (err) {
      console.error(`[migrate-status]   FAILED ${dir}: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // Lista status final.
  const result = await db.query(`
    SELECT migration_name, finished_at
    FROM "_prisma_migrations"
    ORDER BY migration_name;
  `);
  console.log(`[migrate-status] Database migration status:`);
  console.log("");
  console.log(`  ${result.rows.length} migration(s) found in prisma/migrations`);
  console.log("");
  console.log("  Migration Name          Applied At");
  console.log("  ----------------------- --------------------");
  for (const row of result.rows) {
    const finishedAt =
      row.finished_at instanceof Date ? row.finished_at.toISOString() : String(row.finished_at);
    console.log(`  ${String(row.migration_name).padEnd(24)} ${finishedAt}`);
  }
  console.log("");
  console.log(`[migrate-status] All ${applied} migration(s) applied successfully.`);
  console.log("[migrate-status] ✓ Status: in sync (no pending migrations).");

  // Verifica schema.
  const tables = await db.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `);
  console.log(`[migrate-status] ${tables.rows.length} tables in public schema.`);

  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
