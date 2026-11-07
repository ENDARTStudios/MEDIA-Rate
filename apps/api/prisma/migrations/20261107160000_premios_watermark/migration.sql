-- T-DADOS-84: watermark do job de premios no Wikidata (por IMDb id).
ALTER TABLE "midia" ADD COLUMN "premios_em" TIMESTAMP(3);
