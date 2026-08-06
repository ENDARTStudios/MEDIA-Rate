-- T198 (Addendums 3+4): fundação de dado — grafo RelacaoObra + eixos de
-- interação (status/reação/motivoAbandono) em usuario_midia_interacao.

-- 1) Enums (CREATE TYPE não tem IF NOT EXISTS — guard por DO block).
DO $$ BEGIN
  CREATE TYPE "StatusConsumo" AS ENUM ('QUERO_CONSUMIR','CONSUMINDO','CONCLUIDO','ABANDONADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReacaoConsumo" AS ENUM ('GOSTEI','NAO_GOSTEI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MotivoAbandono" AS ENUM ('NAO_CURTI','FALTA_TEMPO','MUDANCA_HUMOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoRelacao" AS ENUM ('ADAPTACAO_DE','SEQUENCIA_DE','PREQUELA_DE','SPINOFF_DE','MESMO_UNIVERSO','MESMA_HISTORIA_REAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Evolução de usuario_midia_interacao (Addendum 4).
ALTER TABLE "usuario_midia_interacao"
  ADD COLUMN IF NOT EXISTS "status" "StatusConsumo" NOT NULL DEFAULT 'QUERO_CONSUMIR',
  ADD COLUMN IF NOT EXISTS "reacao" "ReacaoConsumo",
  ADD COLUMN IF NOT EXISTS "motivo_abandono" "MotivoAbandono",
  ADD COLUMN IF NOT EXISTS "progresso_detalhe" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "iniciado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "concluido_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Dedupe defensivo antes de trocar a UNIQUE (usuario_id, midia_id, tipo)
-- por (usuario_id, midia_id): mantém a linha mais recente por par.
DELETE FROM "usuario_midia_interacao" a
USING "usuario_midia_interacao" b
WHERE a."usuario_id" = b."usuario_id"
  AND a."midia_id" = b."midia_id"
  AND a."created_at" < b."created_at";

ALTER TABLE "usuario_midia_interacao" DROP CONSTRAINT IF EXISTS "usuario_midia_interacao_usuario_id_midia_id_tipo_key";
CREATE UNIQUE INDEX IF NOT EXISTS "usuario_midia_interacao_usuario_id_midia_id_key"
  ON "usuario_midia_interacao"("usuario_id", "midia_id");

-- tipo vira legado opcional (novo fluxo escreve status).
ALTER TABLE "usuario_midia_interacao" ALTER COLUMN "tipo" DROP NOT NULL;
ALTER TABLE "usuario_midia_interacao" ALTER COLUMN "tipo" SET DEFAULT 'consumo';

-- 3) Grafo de obras relacionadas (Addendum 3).
CREATE TABLE IF NOT EXISTS "relacao_obra" (
  "id" UUID NOT NULL,
  "origem_id" UUID NOT NULL,
  "destino_id" UUID NOT NULL,
  "tipo" "TipoRelacao" NOT NULL,
  "nota_editorial" VARCHAR(160),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "relacao_obra_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "relacao_obra_origem_id_fkey" FOREIGN KEY ("origem_id") REFERENCES "midia" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "relacao_obra_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "midia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "relacao_obra_origem_id_destino_id_key" ON "relacao_obra"("origem_id", "destino_id");
CREATE INDEX IF NOT EXISTS "relacao_obra_destino_id_idx" ON "relacao_obra"("destino_id");
CREATE INDEX IF NOT EXISTS "relacao_obra_origem_id_idx" ON "relacao_obra"("origem_id");
