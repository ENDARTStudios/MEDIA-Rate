-- T401 (D-374): índice único PARCIAL em midia.slug — soft-delete-safe.
-- O UNIQUE cheio (T400) dependia de NULLar slug de linhas soft-deleted; o
-- parcial garante unicidade apenas entre ATIVOS (deleted_at IS NULL),
-- eliminando a classe do bug E23505. Volta também o índice de lookup.
DROP INDEX "midia_slug_key";
CREATE INDEX "midia_slug_idx" ON "midia"("slug");
CREATE UNIQUE INDEX "midia_slug_ativo_key" ON "midia"("slug") WHERE "deleted_at" IS NULL;
