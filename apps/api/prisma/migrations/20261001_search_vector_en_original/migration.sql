-- D-560 (auditoria do site público, 2026-09-30): a busca não encontrava
-- títulos por nome em inglês — ex.: "godfather" não casava "O Poderoso
-- Chefão" (titulo localizado em pt; titulo_en = "The Godfather" NÃO era
-- indexado). O usuário busca pelo nome que conhece (EN/original).
--
-- Padrão da 20260809_fix_search_vector: translate() IMMUTABLE (unaccent é
-- STABLE e quebra GENERATED ALWAYS AS ... STORED com 42P17).
--
-- A coluna é GENERATED ALWAYS — o DROP/recreate recalcula todos os vetores
-- automaticamente (sem backfill de dados). Rollback: revert + recriar a
-- expressão original (só coalesce("titulo",'')).

ALTER TABLE "midia" DROP COLUMN IF EXISTS "titulo_tsv";

ALTER TABLE "midia"
  ADD COLUMN "titulo_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', translate(
    coalesce("titulo", '') || ' ' || coalesce("titulo_en", '') || ' ' || coalesce("titulo_original", ''),
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
  ))) STORED;

-- O DROP COLUMN derruba o índice dependente; recria (idempotente).
CREATE INDEX IF NOT EXISTS idx_midia_titulo_tsv ON "midia" USING gin ("titulo_tsv");
