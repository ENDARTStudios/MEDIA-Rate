-- T330 (D-326): coluna slug indexada — elimina full scan + slugify por linha
-- no getBySlug. Backfill via `npm run db:seed:slugs` (slugify é JS, não SQL).
ALTER TABLE "midia" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(300);
CREATE INDEX IF NOT EXISTS "midia_slug_idx" ON "midia"("slug");
