-- AlterTable
-- MET-03 (engine v3): votos por fonte + índice de consenso + votos totais.
ALTER TABLE "avaliacao_fonte" ADD COLUMN     "votos" INTEGER;

ALTER TABLE "media_score" ADD COLUMN     "indice_consenso" DOUBLE PRECISION,
ADD COLUMN     "votos_total" INTEGER;
