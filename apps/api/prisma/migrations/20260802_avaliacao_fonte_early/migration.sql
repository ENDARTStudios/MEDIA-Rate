-- T234: ordem de migrations em DB virgem — avaliacao_fonte é criada AQUI
-- (antes de 20260803_media_score_v3, que faz ALTER TABLE avaliacao_fonte).
-- Idempotente (IF NOT EXISTS): em DBs existentes a tabela já existe → no-op.
-- A migration original 20260803_persistencia_avaliacoes foi ajustada para
-- CREATE TABLE IF NOT EXISTS (mesmo commit, D-267) — produção precisa de
-- `prisma migrate resolve --rolled-back 20260803_persistencia_avaliacoes`
-- + `prisma migrate deploy` uma vez (documentado em DECISOES/T234).

CREATE TABLE IF NOT EXISTS "avaliacao_fonte" (
    "id" UUID NOT NULL,
    "midia_id" UUID NOT NULL,
    "fonte" VARCHAR(32) NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "media_fonte" DOUBLE PRECISION NOT NULL,
    "desvio_fonte" DOUBLE PRECISION NOT NULL,
    "url" TEXT,
    "coletado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "avaliacao_fonte_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "avaliacao_fonte_midia_id_idx" ON "avaliacao_fonte"("midia_id");
