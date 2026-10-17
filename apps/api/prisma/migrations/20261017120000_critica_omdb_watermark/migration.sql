-- T-DADOS-10: watermark da coleta de crítica via OMDb (por id IMDb).
-- Aditiva: coluna nova nullable, SEM backfill — o próprio job
-- (BackfillService.enriquecerCriticaOmdb, fila do drain D-576) popula e marca
-- cada título. Nenhuma coluna/tabela é alterada ou removida; nenhum dado
-- pré-existente é tocado.

-- AlterTable
ALTER TABLE "midia" ADD COLUMN "critica_omdb_em" TIMESTAMP(3);
