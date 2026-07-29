-- Fix: change watchlist_entry.midia_id from UUID to VARCHAR(255)
-- This allows storing non-UUID media IDs (like TMDB IDs, RAWG IDs, etc.)
ALTER TABLE "watchlist_entry" ALTER COLUMN "midia_id" TYPE VARCHAR(255);
