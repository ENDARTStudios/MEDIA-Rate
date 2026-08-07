-- T214: email verification — token opaco 256-bit (hash SHA-256) + expiração 24h.
-- email_verificado_em já existe (não-enforced); backfill marca TODOS os
-- usuários existentes como verificados — NENHUM login existente quebra.

ALTER TABLE "usuario"
  ADD COLUMN IF NOT EXISTS "email_verification_token_hash" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "email_verification_expira_em" TIMESTAMP(3);

UPDATE "usuario"
  SET "email_verificado_em" = NOW()
  WHERE "email_verificado_em" IS NULL;
