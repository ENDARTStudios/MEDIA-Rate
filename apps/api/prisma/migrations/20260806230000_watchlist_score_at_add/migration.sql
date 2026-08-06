-- T190: score da obra no momento da adição à watchlist (indicador "score mudou").
ALTER TABLE "watchlist_entry"
  ADD COLUMN IF NOT EXISTS "score_at_add" DOUBLE PRECISION;
