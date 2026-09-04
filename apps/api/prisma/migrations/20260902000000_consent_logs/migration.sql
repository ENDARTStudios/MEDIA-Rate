-- Migração aditiva (T443): tabela append-only de consentimento.
-- NENHUM drop/alter de colunas existentes. Aplicada pelo passo migrate do pipeline.
CREATE TABLE IF NOT EXISTS "consent_log" (
    "id" uuid NOT NULL,
    "usuario_id" uuid,
    "device_hash" varchar(64),
    "categorias" jsonb NOT NULL,
    "versao" varchar(16) NOT NULL,
    "ts" bigint NOT NULL,
    "idioma" varchar(8) NOT NULL,
    "pais" varchar(8) NOT NULL,
    "ip_hash" varchar(64),
    "criado_em" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consent_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "consent_log_usuario_id_criado_em_idx" ON "consent_log"("usuario_id", "criado_em");
