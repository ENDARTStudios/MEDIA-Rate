-- T164 (Onda C1): metadados ricos — elenco, produtoras/editoras e backdrop.
-- Additive-only (nova enum, tabelas novas e coluna nova; nada é alterado/removido).
-- Rollback (seção `## Rollback` do PR):
--   DROP TABLE IF EXISTS "midia_produtora";
--   DROP TABLE IF EXISTS "midia_elenco";
--   ALTER TABLE "midia" DROP COLUMN IF EXISTS "backdrop_url";
--   DROP TYPE IF EXISTS "PapelProdutora";

-- CreateEnum
CREATE TYPE "PapelProdutora" AS ENUM ('PRODUTORA', 'ESTUDIO', 'EDITORA', 'NETWORK');

-- AlterTable: banner panorâmico (TMDB w1280)
ALTER TABLE "midia" ADD COLUMN "backdrop_url" TEXT;

-- CreateTable midia_elenco
CREATE TABLE "midia_elenco" (
    "id" UUID NOT NULL,
    "midia_id" UUID NOT NULL,
    "fonte" VARCHAR(32) NOT NULL,
    "fonte_id" VARCHAR(64) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "personagem" VARCHAR(160),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "foto_url" TEXT,

    CONSTRAINT "midia_elenco_pkey" PRIMARY KEY ("id")
);

-- CreateTable midia_produtora
CREATE TABLE "midia_produtora" (
    "id" UUID NOT NULL,
    "midia_id" UUID NOT NULL,
    "fonte" VARCHAR(32) NOT NULL,
    "fonte_id" VARCHAR(64) NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "papel" "PapelProdutora" NOT NULL DEFAULT 'PRODUTORA',

    CONSTRAINT "midia_produtora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "midia_elenco_midia_id_fonte_fonte_id_key" ON "midia_elenco"("midia_id", "fonte", "fonte_id");
CREATE INDEX "midia_elenco_midia_id_idx" ON "midia_elenco"("midia_id");
CREATE UNIQUE INDEX "midia_produtora_midia_id_fonte_fonte_id_key" ON "midia_produtora"("midia_id", "fonte", "fonte_id");
CREATE INDEX "midia_produtora_midia_id_idx" ON "midia_produtora"("midia_id");

-- AddForeignKey
ALTER TABLE "midia_elenco" ADD CONSTRAINT "midia_elenco_midia_id_fkey" FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "midia_produtora" ADD CONSTRAINT "midia_produtora_midia_id_fkey" FOREIGN KEY ("midia_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
