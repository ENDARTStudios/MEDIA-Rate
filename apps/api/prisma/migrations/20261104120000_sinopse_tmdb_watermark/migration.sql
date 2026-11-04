-- T-DADOS-74: watermark do job de sinopse EN via TMDB (overview en-US).
ALTER TABLE "midia" ADD COLUMN "sinopse_tmdb_em" TIMESTAMP(3);
