-- T223: corrige colunas geradas STORED inválidas (erro 42P17 em produção).
--
-- CAUSA RAIZ (D-224): unaccent() é STABLE, não IMMUTABLE — o Postgres
-- rejeita funções STABLE em GENERATED ALWAYS AS (...) STORED. A migration
-- original (20260808_add_search_vector) usava
--   to_tsvector('portuguese', unaccent(coalesce(...)))
-- e falhava ao aplicar em produção com 42P17 (generation expression is
-- not immutable).
--
-- SOLUÇÃO: usar translate() (built-in IMMUTABLE do Postgres, sem unaccent,
-- sem wrapper/ALTER FUNCTION) para remover acentos ANTES do stemming. O
-- dictionary 'portuguese' NÃO normaliza acentos (testado: 'história' →
-- lexema 'histór' vs 'historia' → 'histor' — lexemas distintos, busca não
-- cruza). translate() torna 'ação' e 'acao' o mesmo texto, garantindo
-- busca full-text insensível a acentos nos dois sentidos.
--
-- A migration 20260808_add_search_vector foi desabilitada (movida para
-- prisma/migrations-disabled/ com sufixo .disabled) para não reaplicar o
-- erro em ambientes limpos.

-- 1) Remove as colunas geradas inválidas (se existirem).
ALTER TABLE "midia"
  DROP COLUMN IF EXISTS "titulo_tsv",
  DROP COLUMN IF EXISTS "sinopse_tsv";

-- 2) Recria com expressão IMMUTABLE (translate() normaliza acentos).
ALTER TABLE "midia"
  ADD COLUMN "titulo_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', translate(coalesce("titulo", ''),
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'))) STORED,
  ADD COLUMN "sinopse_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', translate(coalesce("sinopse", ''),
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'))) STORED;

-- 3) Índices GIN para busca full-text (mesmo nome da original — idempotente).
CREATE INDEX IF NOT EXISTS idx_midia_titulo_tsv ON "midia" USING gin ("titulo_tsv");
CREATE INDEX IF NOT EXISTS idx_midia_sinopse_tsv ON "midia" USING gin ("sinopse_tsv");
