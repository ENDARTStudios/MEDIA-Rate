-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ClassificacaoIndicativa" AS ENUM ('L', 'DEZ', 'DOZE', 'CATORZE', 'DEZESSEIS', 'DEZOITO');

-- CreateEnum
CREATE TYPE "TipoMidia" AS ENUM ('FILME', 'SERIE', 'GAME', 'LIVRO');

-- CreateEnum
CREATE TYPE "Plano" AS ENUM ('FREE', 'PLUS', 'PREMIUM');

-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('ATIVA', 'CANCELADA', 'PAST_DUE', 'TRIALING', 'PAUSADA');

-- CreateEnum
CREATE TYPE "TipoEventoPagamento" AS ENUM ('CHECKOUT_SESSION_COMPLETED', 'CUSTOMER_SUBSCRIPTION_CREATED', 'CUSTOMER_SUBSCRIPTION_UPDATED', 'CUSTOMER_SUBSCRIPTION_DELETED', 'INVOICE_PAYMENT_SUCCEEDED', 'INVOICE_PAYMENT_FAILED', 'CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END');

-- CreateEnum
CREATE TYPE "PapelNome" AS ENUM ('USER', 'ADMIN', 'MODERADOR');

-- CreateEnum
CREATE TYPE "FinalidadeConsentimento" AS ENUM ('MARKETING', 'RECOMENDACAO_PERSONALIZADA', 'COMPARTILHAMENTO_DADOS', 'COOKIES_ANALITICOS');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nome" VARCHAR(255),
    "dados_para_exclusao_at" TIMESTAMP(3),
    "email_verificado_em" TIMESTAMP(3),
    "ultimo_login_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_agent" TEXT,
    "ip_criacao" INET,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papel" (
    "id" SERIAL NOT NULL,
    "nome" "PapelNome" NOT NULL,

    CONSTRAINT "papel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_papel" (
    "usuario_id" UUID NOT NULL,
    "papel_id" INTEGER NOT NULL,
    "atribuido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atribuido_por" UUID,

    CONSTRAINT "usuario_papel_pkey" PRIMARY KEY ("usuario_id","papel_id")
);

-- CreateTable
CREATE TABLE "entitlement" (
    "chave" VARCHAR(64) NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" VARCHAR(32) NOT NULL,
    "valor_padrao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "plano_entitlement" (
    "plano" "Plano" NOT NULL,
    "entitlement_chave" VARCHAR(64) NOT NULL,
    "valor" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plano_entitlement_pkey" PRIMARY KEY ("plano","entitlement_chave")
);

-- CreateTable
CREATE TABLE "usuario_plano" (
    "usuario_id" UUID NOT NULL,
    "plano" "Plano" NOT NULL DEFAULT 'FREE',
    "status" "StatusAssinatura" NOT NULL DEFAULT 'ATIVA',
    "stripe_subscription_id" VARCHAR(255),
    "stripe_customer_id" VARCHAR(255),
    "current_period_end" TIMESTAMP(3),
    "cancela_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_plano_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "evento_pagamento" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "stripe_event_id" VARCHAR(255) NOT NULL,
    "tipo" "TipoEventoPagamento" NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "payload_raw" JSONB NOT NULL,
    "processado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultado" VARCHAR(32) NOT NULL,
    "erro_mensagem" TEXT,

    CONSTRAINT "evento_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimento_usuario" (
    "id" SERIAL NOT NULL,
    "usuario_id" UUID NOT NULL,
    "finalidade" "FinalidadeConsentimento" NOT NULL,
    "consentido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogado_em" TIMESTAMP(3),
    "texto_versao" VARCHAR(32) NOT NULL,
    "ip_aceite" INET,

    CONSTRAINT "consentimento_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "midia" (
    "id" UUID NOT NULL,
    "fonte_id" VARCHAR(64) NOT NULL,
    "fonte" VARCHAR(32) NOT NULL,
    "tipo" "TipoMidia" NOT NULL,
    "titulo" TEXT NOT NULL,
    "titulo_original" TEXT,
    "sinopse" TEXT,
    "ano_lancamento" INTEGER,
    "classificacao_indicativa" "ClassificacaoIndicativa",
    "imagem_url" TEXT,
    "duracao_minutos" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "midia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_score" (
    "id" UUID NOT NULL,
    "midia_id" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "num_fontes" INTEGER NOT NULL,
    "pesos_usados" JSONB NOT NULL,
    "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_midia_interacao" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "midia_id" UUID NOT NULL,
    "tipo" VARCHAR(32) NOT NULL,
    "rating" INTEGER,
    "comentario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_midia_interacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_entry" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "midia_id" UUID NOT NULL,
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencia_usuario" (
    "usuario_id" UUID NOT NULL,
    "preferencias_blob" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferencia_usuario_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "media_score_view" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "midia_id" UUID NOT NULL,
    "score_exibido" DOUBLE PRECISION NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_score_view_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_token_hash_key" ON "sessao"("token_hash");

-- CreateIndex
CREATE INDEX "sessao_usuario_id_idx" ON "sessao"("usuario_id");

-- CreateIndex
CREATE INDEX "sessao_expires_at_idx" ON "sessao"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "papel_nome_key" ON "papel"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_plano_stripe_subscription_id_key" ON "usuario_plano"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "evento_pagamento_stripe_event_id_key" ON "evento_pagamento"("stripe_event_id");

-- CreateIndex
CREATE INDEX "evento_pagamento_usuario_id_idx" ON "evento_pagamento"("usuario_id");

-- CreateIndex
CREATE INDEX "evento_pagamento_tipo_idx" ON "evento_pagamento"("tipo");

-- CreateIndex
CREATE INDEX "evento_pagamento_processado_em_idx" ON "evento_pagamento"("processado_em");

-- CreateIndex
CREATE INDEX "consentimento_usuario_usuario_id_idx" ON "consentimento_usuario"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "consentimento_usuario_usuario_id_finalidade_key" ON "consentimento_usuario"("usuario_id", "finalidade");

-- CreateIndex
CREATE INDEX "midia_tipo_idx" ON "midia"("tipo");

-- CreateIndex
CREATE INDEX "midia_titulo_idx" ON "midia"("titulo");

-- CreateIndex
CREATE UNIQUE INDEX "midia_fonte_fonte_id_key" ON "midia"("fonte", "fonte_id");

-- CreateIndex
CREATE INDEX "media_score_score_idx" ON "media_score"("score");

-- CreateIndex
CREATE UNIQUE INDEX "media_score_midia_id_key" ON "media_score"("midia_id");

-- CreateIndex
CREATE INDEX "usuario_midia_interacao_usuario_id_idx" ON "usuario_midia_interacao"("usuario_id");

-- CreateIndex
CREATE INDEX "usuario_midia_interacao_midia_id_idx" ON "usuario_midia_interacao"("midia_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_midia_interacao_usuario_id_midia_id_tipo_key" ON "usuario_midia_interacao"("usuario_id", "midia_id", "tipo");

-- CreateIndex
CREATE INDEX "watchlist_entry_usuario_id_idx" ON "watchlist_entry"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_entry_usuario_id_midia_id_key" ON "watchlist_entry"("usuario_id", "midia_id");

-- CreateIndex
CREATE INDEX "media_score_view_usuario_id_idx" ON "media_score_view"("usuario_id");

-- CreateIndex
CREATE INDEX "media_score_view_midia_id_idx" ON "media_score_view"("midia_id");

-- CreateIndex
CREATE INDEX "media_score_view_viewed_at_idx" ON "media_score_view"("viewed_at");

-- AddForeignKey
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_papel" ADD CONSTRAINT "usuario_papel_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_papel" ADD CONSTRAINT "usuario_papel_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "papel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_entitlement" ADD CONSTRAINT "plano_entitlement_entitlement_chave_fkey" FOREIGN KEY ("entitlement_chave") REFERENCES "entitlement"("chave") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_plano" ADD CONSTRAINT "usuario_plano_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_pagamento" ADD CONSTRAINT "evento_pagamento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimento_usuario" ADD CONSTRAINT "consentimento_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_score" ADD CONSTRAINT "media_score_midia_id_fkey" FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_midia_interacao" ADD CONSTRAINT "usuario_midia_interacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_midia_interacao" ADD CONSTRAINT "usuario_midia_interacao_midia_id_fkey" FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_entry" ADD CONSTRAINT "watchlist_entry_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_entry" ADD CONSTRAINT "watchlist_entry_midia_id_fkey" FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencia_usuario" ADD CONSTRAINT "preferencia_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_score_view" ADD CONSTRAINT "media_score_view_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_score_view" ADD CONSTRAINT "media_score_view_midia_id_fkey" FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

