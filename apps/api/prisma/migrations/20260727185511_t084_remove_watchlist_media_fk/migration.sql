-- T084: Remove foreign key from watchlist_entry.midia_id to midia.id
-- The relation was removed from both WatchlistEntry and Midia models
-- midia_id becomes a plain string (UUID format, but no FK constraint)

-- Drop the foreign key constraint on watchlist_entry
ALTER TABLE "watchlist_entry" DROP CONSTRAINT IF EXISTS "watchlist_entry_midia_id_fkey";

-- Note: The midia_id column type remains @db.Uuid — unchanged.
-- The application layer now converts string IDs to UUID v5 format.
