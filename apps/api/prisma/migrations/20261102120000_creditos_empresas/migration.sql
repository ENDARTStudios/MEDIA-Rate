-- T-DADOS-60: créditos de ENTIDADE por mídia (o que corresponde ao "elenco"
-- em cada tipo): produtora/emissora (filme/série), desenvolvedora/publicadora
-- (game), editora (livro/quadrinho), revista (mangá).
-- Watermark nullable: fila do drain sem prender títulos já processados.
ALTER TABLE "midia" ADD COLUMN "creditos_em" TIMESTAMP(3);
