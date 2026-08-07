-- T215 (4.1/2.9): soft delete em Midia — deleted_at + índice parcial.
-- Backfill: NULL para todos os existentes (nada deletado).

ALTER TABLE "midia"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS idx_midia_deleted_at
  ON "midia"("deleted_at") WHERE "deleted_at" IS NULL;
