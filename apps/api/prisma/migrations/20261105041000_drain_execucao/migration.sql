-- T-DADOS-89: heartbeat do drain (uma linha por tique executado).
CREATE TABLE "drain_execucao" (
    "id" BIGSERIAL NOT NULL,
    "quando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caminho" VARCHAR(16) NOT NULL,
    "duracao_ms" INTEGER NOT NULL,
    "lotes" JSONB NOT NULL,
    "erro" TEXT,

    CONSTRAINT "drain_execucao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "drain_execucao_quando_idx" ON "drain_execucao"("quando");
