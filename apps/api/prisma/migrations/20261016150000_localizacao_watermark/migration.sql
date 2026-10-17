-- T-DADOS-08: watermark da coleta de localização (sinopse/título en/es) e
-- classificação indicativa/regional do TMDB. Aditiva: coluna nova nullable,
-- SEM backfill — o próprio job (BackfillService.enriquecerLocalizacao, fila do
-- drain D-576) popula e marca cada título. Nenhuma coluna/tabela é alterada ou
-- removida; nenhum dado pré-existente é tocado.

-- AlterTable
ALTER TABLE "midia" ADD COLUMN "localizacao_em" TIMESTAMP(3);
