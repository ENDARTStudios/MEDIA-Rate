-- T-DADOS-92: watermark do job de relacoes de MANGA no MAL (related_manga).
ALTER TABLE "midia" ADD COLUMN "relacoes_mal_em" TIMESTAMP(3);
