-- T-DADOS-02 (D2): coleta de provedores de streaming (TMDB append
-- watch/providers = JustWatch, região BR — limitação conhecida: o schema por
-- enquanto não modela região/categoria). Aditiva: coluna nova nullable em
-- midia (SEM backfill — o job BackfillService.enriquecerProvedores, fila do
-- drain D-576, popula e marca cada título) + coluna nullable + índice UNIQUE
-- em streaming_service (vínculo estável com o provider_id da TMDB). Nenhuma
-- coluna/tabela existente é alterada ou removida; nenhum dado pré-existente é
-- tocado (as duas tabelas estão vazias em produção).

-- AlterTable
ALTER TABLE "midia" ADD COLUMN "provedores_em" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "streaming_service" ADD COLUMN "tmdb_provider_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "streaming_service_tmdb_provider_id_key" ON "streaming_service"("tmdb_provider_id");
