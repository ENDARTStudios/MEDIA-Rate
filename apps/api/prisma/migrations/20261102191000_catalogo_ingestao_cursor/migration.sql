-- T-DADOS-63: cursor do motor de ingestão em escala por mídia (a "descoberta"
-- de catálogo roda dentro da API, uma linha por tipo+fonte).
CREATE TABLE "ingestao_cursor" (
    "tipo" "TipoMidia" NOT NULL,
    "fonte" VARCHAR(32) NOT NULL,
    "cursor" JSONB,
    "vistos" INTEGER NOT NULL DEFAULT 0,
    "inseridos" INTEGER NOT NULL DEFAULT 0,
    "pausado" BOOLEAN NOT NULL DEFAULT false,
    "concluido_em" TIMESTAMP(3),
    "ultimo_erro" TEXT,
    "ultima_rodada_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestao_cursor_pkey" PRIMARY KEY ("tipo","fonte")
);
