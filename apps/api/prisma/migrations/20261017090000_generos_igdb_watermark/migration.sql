-- T-DADOS-09: watermark da coleta de gêneros de games no IGDB (por id).
-- Aditiva: coluna nova nullable, SEM backfill — o próprio job
-- (BackfillService.enriquecerGenerosGames, fila do drain D-576) popula e marca
-- cada título. Nenhuma coluna/tabela é alterada ou removida; nenhum dado
-- pré-existente é tocado.

-- AlterTable
ALTER TABLE "midia" ADD COLUMN "generos_igdb_em" TIMESTAMP(3);
