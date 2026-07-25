-- Migration: enable pg_trgm for full-text search (Fase 4.8)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice trigram nos títulos de mídia (busca por similaridade)
CREATE INDEX IF NOT EXISTS idx_midia_titulo_trgm ON "midia" USING gin ("titulo" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_midia_sinopse_trgm ON "midia" USING gin ("sinopse" gin_trgm_ops);
