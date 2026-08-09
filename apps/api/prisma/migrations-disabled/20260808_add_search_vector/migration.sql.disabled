-- T208 (4.5/4.8): full-text search com tsvector + unaccent em titulo/sinopse.
-- Colunas geradas (STORED): o Postgres mantém o tsvector sincronizado com o
-- texto — nada de trigger/backfill manual. Acesso via $queryRaw (Prisma não
-- modela colunas geradas; acessadas apenas em busca).

CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE "midia"
  ADD COLUMN IF NOT EXISTS "titulo_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', unaccent(coalesce("titulo", '')))) STORED;

ALTER TABLE "midia"
  ADD COLUMN IF NOT EXISTS "sinopse_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', unaccent(coalesce("sinopse", '')))) STORED;

CREATE INDEX IF NOT EXISTS idx_midia_titulo_tsv ON "midia" USING gin ("titulo_tsv");
CREATE INDEX IF NOT EXISTS idx_midia_sinopse_tsv ON "midia" USING gin ("sinopse_tsv");
