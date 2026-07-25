-- Migration: add_password_reset_fields
-- Fase 3 complemento: reset de senha, sliding session

ALTER TABLE "usuario"
  ADD COLUMN IF NOT EXISTS "password_reset_token" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "password_reset_expira" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "usuario_password_reset_token_key" ON "usuario"("password_reset_token");
