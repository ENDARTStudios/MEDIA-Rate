-- Migration: add_genres_streaming_audit_watchlist_coluna_invoices_anime_comic
-- Fase 2 complemento: gêneros, streaming, auditoria, coluna watchlist, ANIME/COMIC, faturas

-- 1. Adicionar ANIME e COMIC ao enum TipoMidia
ALTER TYPE "TipoMidia" ADD VALUE IF NOT EXISTS 'ANIME';
ALTER TYPE "TipoMidia" ADD VALUE IF NOT EXISTS 'COMIC';

-- 2. Criar enum WatchlistColuna
DO $$ BEGIN
    CREATE TYPE "WatchlistColuna" AS ENUM ('WANT', 'WATCHING', 'COMPLETED', 'DROPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Adicionar coluna à WatchlistEntry
ALTER TABLE "watchlist_entry"
  ADD COLUMN IF NOT EXISTS "coluna" "WatchlistColuna" NOT NULL DEFAULT 'WANT',
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- 4. Criar tabela genero
CREATE TABLE IF NOT EXISTS "genero" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    CONSTRAINT "genero_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "genero_nome_key" UNIQUE ("nome"),
    CONSTRAINT "genero_slug_key" UNIQUE ("slug")
);

-- 5. Criar tabela midia_genero
CREATE TABLE IF NOT EXISTS "midia_genero" (
    "midia_id" UUID NOT NULL,
    "genero_id" INTEGER NOT NULL,
    CONSTRAINT "midia_genero_pkey" PRIMARY KEY ("midia_id", "genero_id")
);
ALTER TABLE "midia_genero" ADD CONSTRAINT "midia_genero_midia_id_fkey" FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE;
ALTER TABLE "midia_genero" ADD CONSTRAINT "midia_genero_genero_id_fkey" FOREIGN KEY ("genero_id") REFERENCES "genero"("id") ON DELETE CASCADE;

-- 6. Criar tabela streaming_service
CREATE TABLE IF NOT EXISTS "streaming_service" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    CONSTRAINT "streaming_service_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "streaming_service_nome_key" UNIQUE ("nome"),
    CONSTRAINT "streaming_service_slug_key" UNIQUE ("slug")
);

-- 7. Criar tabela midia_streaming
CREATE TABLE IF NOT EXISTS "midia_streaming" (
    "midia_id" UUID NOT NULL,
    "service_id" INTEGER NOT NULL,
    "url" TEXT,
    CONSTRAINT "midia_streaming_pkey" PRIMARY KEY ("midia_id", "service_id")
);
ALTER TABLE "midia_streaming" ADD CONSTRAINT "midia_streaming_midia_id_fkey" FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE;
ALTER TABLE "midia_streaming" ADD CONSTRAINT "midia_streaming_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "streaming_service"("id") ON DELETE CASCADE;

-- 8. Criar tabela audit_log
CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entidade" VARCHAR(64) NOT NULL,
    "entidade_id" VARCHAR(64) NOT NULL,
    "acao" VARCHAR(32) NOT NULL,
    "usuario_id" UUID,
    "dados_antes" JSONB,
    "dados_depois" JSONB,
    "ip_origem" INET,
    "hash_cadeia" VARCHAR(64) NOT NULL,
    "hash_anterior" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "audit_log_hash_cadeia_key" ON "audit_log"("hash_cadeia");
CREATE INDEX IF NOT EXISTS "audit_log_entidade_idx" ON "audit_log"("entidade", "entidade_id");
CREATE INDEX IF NOT EXISTS "audit_log_usuario_id_idx" ON "audit_log"("usuario_id");
CREATE INDEX IF NOT EXISTS "audit_log_acao_idx" ON "audit_log"("acao");
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log"("created_at");
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL;

-- 9. Criar tabela fatura
CREATE TABLE IF NOT EXISTS "fatura" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "plano" "Plano" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "moeda" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "stripe_invoice_id" VARCHAR(255),
    "periodo_inicio" TIMESTAMP(3) NOT NULL,
    "periodo_fim" TIMESTAMP(3) NOT NULL,
    "pago_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "fatura_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "fatura_stripe_invoice_id_key" ON "fatura"("stripe_invoice_id");
CREATE INDEX IF NOT EXISTS "fatura_usuario_id_idx" ON "fatura"("usuario_id");
CREATE INDEX IF NOT EXISTS "fatura_status_idx" ON "fatura"("status");
CREATE INDEX IF NOT EXISTS "fatura_created_at_idx" ON "fatura"("created_at");
ALTER TABLE "fatura" ADD CONSTRAINT "fatura_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE;
