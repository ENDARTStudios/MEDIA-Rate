-- T-DADOS-13B: watermark da coleta de autores de LIVRO (OpenLibrary por id) e
-- de MANGA (Jikan/Kitsu por id), gravados em midia_elenco com
-- personagem = 'Autor'. Aditiva: coluna nova nullable em midia (SEM backfill —
-- o job BackfillService.enriquecerAutoresLivros/enriquecerAutoresMangas,
-- fila do drain D-576, popula e marca cada título). Nenhuma coluna/tabela
-- existente é alterada ou removida; nenhum dado pré-existente é tocado.

-- AlterTable
ALTER TABLE "midia" ADD COLUMN "autores_em" TIMESTAMP(3);
