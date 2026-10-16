-- T-DADOS-01 (D1): watermark do enriquecimento rico TMDB v2 (duração,
-- gêneros, coleção/franquia). Aditiva: coluna nova nullable, SEM backfill —
-- o próprio job (BackfillService.enriquecerMetadadosRicos, fila do drain
-- D-576) popula e marca cada título. Nenhuma coluna/tabela é alterada ou
-- removida; nenhum dado pré-existente é tocado.

-- AlterTable
ALTER TABLE "midia" ADD COLUMN "metadados_ricos_em" TIMESTAMP(3);
