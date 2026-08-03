-- AlterTable
ALTER TABLE "midia" ADD COLUMN     "avaliacoes_atualizadas_em" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "media_score" ADD COLUMN     "confianca" DOUBLE PRECISION,
ADD COLUMN     "consenso" DOUBLE PRECISION,
ADD COLUMN     "detalhes" JSONB,
ADD COLUMN     "score_critica" DOUBLE PRECISION,
ADD COLUMN     "score_publico" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "avaliacao_fonte" (
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

-- CreateIndex
CREATE INDEX "avaliacao_fonte_midia_id_idx" ON "avaliacao_fonte"("midia_id");

-- CreateIndex
CREATE UNIQUE INDEX "avaliacao_fonte_midia_id_fonte_key" ON "avaliacao_fonte"("midia_id", "fonte");

-- AddForeignKey
ALTER TABLE "avaliacao_fonte" ADD CONSTRAINT "avaliacao_fonte_midia_id_fkey" FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

