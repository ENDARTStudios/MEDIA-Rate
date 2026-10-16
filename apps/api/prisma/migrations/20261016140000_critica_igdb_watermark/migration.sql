-- T-DADOS-03 (D3): watermark da coleta dedicada de crítica do IGDB (por id).
-- Aditiva: coluna nova nullable, SEM backfill — o próprio job
-- (BackfillService.enriquecerCriticaIgdb, fila do drain D-576) popula e marca
-- cada título. Nenhuma coluna/tabela é alterada ou removida; nenhum dado
-- pré-existente é tocado.

-- AlterTable
ALTER TABLE "midia" ADD COLUMN "critica_igdb_em" TIMESTAMP(3);
