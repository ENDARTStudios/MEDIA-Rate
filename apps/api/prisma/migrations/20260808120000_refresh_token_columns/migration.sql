-- T212 (3.3): refresh token rotativo + sliding session.
-- Colunas em "sessao":
--   refresh_token_hash        SHA-256 do refresh token atual (nunca plaintext)
--   refresh_token_hash_anterior SHA-256 do refresh ANTERIOR (detecção de
--                            reuse: token já rotacionado usado de novo)
--   refresh_expira_em         expiração do refresh (30 dias)
--   refresh_family_id         UUID que agrupa rotações da mesma sessão

ALTER TABLE "sessao"
  ADD COLUMN IF NOT EXISTS "refresh_token_hash" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "refresh_token_hash_anterior" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "refresh_expira_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "refresh_family_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "sessao_refresh_token_hash_key"
  ON "sessao"("refresh_token_hash") WHERE "refresh_token_hash" IS NOT NULL;

-- Backfill conservador: sessões existentes (sem refresh) continuam válidas
-- até expirar (7 dias), ganham family_id e refresh_expira_em = expires_at —
-- mas NÃO podem renovar via /refresh (sem refresh_token_hash).
UPDATE "sessao"
  SET "refresh_family_id" = gen_random_uuid(),
      "refresh_expira_em" = "expires_at"
  WHERE "refresh_family_id" IS NULL;
