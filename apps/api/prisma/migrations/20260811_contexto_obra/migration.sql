-- T287 (Addendum 2): contexto da obra — classificação por região, prêmios e
-- origem editorial. ADITIVA; aplica em DB virgem (T234-compatível).

CREATE TYPE "OrigemEditorial" AS ENUM (
  'FILME', 'SERIE', 'GAME', 'LIVRO', 'HQ', 'MANGA', 'ORIGINAL'
);

CREATE TYPE "RegiaoClassificacao" AS ENUM ('BR', 'US', 'ES');

-- Origem editorial da obra (mídia original da qual deriva).
ALTER TABLE "midia" ADD COLUMN "origem_editorial" "OrigemEditorial";

-- Classificação indicativa por região (unique por mídia+região).
CREATE TABLE "classificacao_regiao" (
  "midia_id" UUID NOT NULL,
  "regiao" "RegiaoClassificacao" NOT NULL,
  "valor" VARCHAR(32) NOT NULL,
  "fonte" VARCHAR(32) NOT NULL,
  CONSTRAINT "classificacao_regiao_pkey" PRIMARY KEY ("midia_id", "regiao")
);

-- Prêmios (UML da Arquitetura — Award).
CREATE TABLE "premio" (
  "id" UUID NOT NULL,
  "midia_id" UUID NOT NULL,
  "nome" VARCHAR(160) NOT NULL,
  "categoria" VARCHAR(160) NOT NULL,
  "ano" INTEGER NOT NULL,
  "venceu" BOOLEAN NOT NULL DEFAULT true,
  "organizacao" VARCHAR(120) NOT NULL,
  CONSTRAINT "premio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "premio_midia_id_idx" ON "premio"("midia_id");

ALTER TABLE "classificacao_regiao"
  ADD CONSTRAINT "classificacao_regiao_midia_id_fkey"
    FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "premio"
  ADD CONSTRAINT "premio_midia_id_fkey"
    FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
