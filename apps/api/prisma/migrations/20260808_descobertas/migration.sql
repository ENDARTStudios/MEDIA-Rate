-- T201 (G4): rastrear a ORIGEM da descoberta cross-mídia em
-- usuario_midia_interacao. Quando o usuário aceita o prompt da watchlist,
-- gravamos a aresta do grafo (relacao_obra) que o levou ao título. O campo é
-- opcional (SetNull em delete da aresta) e idempotente.

-- 1) Coluna (IF NOT EXISTS).
ALTER TABLE "usuario_midia_interacao"
  ADD COLUMN IF NOT EXISTS "origem_relacao_id" UUID;

-- 2) FK (Postgres não tem ADD CONSTRAINT IF NOT EXISTS — guard por DO block).
DO $$ BEGIN
  ALTER TABLE "usuario_midia_interacao"
    ADD CONSTRAINT "usuario_midia_interacao_origem_relacao_id_fkey"
    FOREIGN KEY ("origem_relacao_id") REFERENCES "relacao_obra"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Índice para o GET /discoveries (filtro por usuário + origem presente).
CREATE INDEX IF NOT EXISTS "usuario_midia_interacao_origem_relacao_id_idx"
  ON "usuario_midia_interacao"("origem_relacao_id");
