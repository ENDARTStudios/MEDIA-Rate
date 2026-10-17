-- T-DADOS-12: watermark da coleta de sinopse em inglês (sinopse_en) dos
-- mangás nas fontes kitsu/jikan, por id EXATO da fonte. Aditiva: coluna nova
-- nullable, SEM backfill — o próprio job
-- (BackfillService.enriquecerSinopseMangaEn, fila do drain D-576) popula e
-- marca cada título. Nenhuma coluna/tabela existente é alterada ou removida;
-- nenhum dado pré-existente é tocado.

-- AlterTable
ALTER TABLE "midia" ADD COLUMN "sinopse_en_em" TIMESTAMP(3);
