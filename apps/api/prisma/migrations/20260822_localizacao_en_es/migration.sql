-- T400 (D-366/D-369): migração ADITIVA de localização — título/sinopse por
-- locale (en/es), todas nullable (zero perda). T398-restante: índice UNIQUE
-- em midia.slug (pré-condição 0 duplicados cumprida por seed-fix-slug-colisoes).
ALTER TABLE "midia" ADD COLUMN "titulo_en" TEXT;
ALTER TABLE "midia" ADD COLUMN "titulo_es" TEXT;
ALTER TABLE "midia" ADD COLUMN "sinopse_en" TEXT;
ALTER TABLE "midia" ADD COLUMN "sinopse_es" TEXT;

-- T398-restante: UNIQUE em slug substitui o índice não-único da T330.
-- Coluna nullable → múltiplos NULL permitidos (semântica padrão do PostgreSQL).
DROP INDEX "midia_slug_idx";
CREATE UNIQUE INDEX "midia_slug_key" ON "midia"("slug");
