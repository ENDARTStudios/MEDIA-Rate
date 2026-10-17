-- T-DADOS-14B: watermark da coleta de sinopse dos LIVROS do catálogo
-- OpenLibrary (editions → Google Books por ISBN, roteada por idioma).
-- Aditiva: coluna nova nullable, SEM backfill — o próprio job
-- (BackfillService.enriquecerSinopseLivros, fila do drain D-576) popula e
-- marca cada título. Nenhuma coluna/tabela existente é alterada ou removida;
-- nenhum dado pré-existente é tocado.

-- AlterTable
ALTER TABLE "midia" ADD COLUMN "sinopse_livro_em" TIMESTAMP(3);
