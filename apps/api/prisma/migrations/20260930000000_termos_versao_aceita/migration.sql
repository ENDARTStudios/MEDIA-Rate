-- T155/J-020: versão exata dos Termos aceita (evidência probatória LGPD).
ALTER TABLE "Usuario" ADD COLUMN "termos_versao_aceita" VARCHAR(20);

-- Backfill: '1.0' é a única versão publicada dos Termos (13/08/2026);
-- todo aceite existente refere-se a ela.
UPDATE "Usuario"
SET "termos_versao_aceita" = '1.0'
WHERE "termos_aceitos_em" IS NOT NULL
  AND "termos_versao_aceita" IS NULL;
