-- T198 (Addendum 2 Parte 4 + 3 Parte 3): gênero normalizado com dualidade
-- NARRATIVO (compartilhado cross-mídia) vs SUBGENERO (restrito a midia_alvo).

DO $$ BEGIN
  CREATE TYPE "GeneroTipo" AS ENUM ('NARRATIVO','SUBGENERO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "genero"
  ADD COLUMN IF NOT EXISTS "tipo" "GeneroTipo" NOT NULL DEFAULT 'NARRATIVO',
  ADD COLUMN IF NOT EXISTS "midia_alvo" "TipoMidia";

CREATE INDEX IF NOT EXISTS "genero_tipo_idx" ON "genero"("tipo");
