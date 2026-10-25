-- UAT-46: registro público de patrocínios (tabela nova "patrocinio").
-- Aditiva: cria tabela + índice + FK para usuario (ON DELETE SET NULL —
-- remover o usuário mantém o registro público de transparência). Nenhuma
-- tabela/coluna existente é alterada; nenhum dado pré-existente é tocado.

-- CreateTable
CREATE TABLE "patrocinio" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "patrocinador" VARCHAR(128) NOT NULL,
    "secao" VARCHAR(128) NOT NULL,
    "rotulo" VARCHAR(255) NOT NULL,
    "desde" DATE NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removido_em" TIMESTAMP(3),

    CONSTRAINT "patrocinio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patrocinio_usuario_id_idx" ON "patrocinio"("usuario_id");

-- AddForeignKey
ALTER TABLE "patrocinio" ADD CONSTRAINT "patrocinio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
