// Script para validar a migration inicial em PostgreSQL real (via pglite).
// Roda a migration SQL contra um banco em memória e reporta sucesso/erro.
/* eslint-disable no-console */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(__dirname, "../prisma/migrations/20260718000000_init/migration.sql");

async function main(): Promise<void> {
  const sql = readFileSync(migrationPath, "utf8");
  console.log(`[apply-migration] Loaded ${sql.length} bytes from ${migrationPath}`);

  const db = new PGlite();
  console.log("[apply-migration] PGlite instance created (in-memory)");

  // Executa a migration. PGlite suporta multi-statement via exec().
  try {
    await db.exec(sql);
    console.log("[apply-migration] Migration applied successfully");
  } catch (err) {
    console.error("[apply-migration] Migration failed:", (err as Error).message);
    process.exit(1);
  }

  // Verifica tabelas criadas.
  const tables = await db.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  console.log(`[apply-migration] ${tables.rows.length} tables created:`);
  for (const row of tables.rows) {
    console.log(`  - ${row.tablename}`);
  }

  // Verifica enums criados.
  const enums = await db.query(`
    SELECT typname FROM pg_type
    WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ORDER BY typname;
  `);
  console.log(`[apply-migration] ${enums.rows.length} enums created:`);
  for (const row of enums.rows) {
    console.log(`  - ${row.typname}`);
  }

  await db.close();
  console.log("[apply-migration] Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
