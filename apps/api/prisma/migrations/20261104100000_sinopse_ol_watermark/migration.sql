-- T-DADOS-69: watermark do job de sinopse via OpenLibrary (`description` do
-- work). Coluna separada de `sinopse_livro_em` (Google Books) para as duas
-- fontes não se bloquearem.
ALTER TABLE "midia" ADD COLUMN "sinopse_ol_em" TIMESTAMP(3);
