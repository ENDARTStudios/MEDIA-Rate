-- T286 (Addenda 3/4): DiscoveryEvent + feed "Descobertas".
-- ADITIVA: nova tabela + índices; não altera nada existente; aplica em DB virgem.

CREATE TABLE "discovery_event" (
  "id" UUID NOT NULL,
  "usuario_id" UUID NOT NULL,
  "from_media_id" UUID NOT NULL,
  "to_media_id" UUID NOT NULL,
  "relation_type" "TipoRelacao" NOT NULL,
  "created_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "discovery_event_pkey" PRIMARY KEY ("id")
);

-- Idempotência: um usuário só gera UM evento por obra-alvo (nunca duplica).
CREATE UNIQUE INDEX "discovery_event_usuario_id_to_media_id_key"
  ON "discovery_event"("usuario_id", "to_media_id");

CREATE INDEX "discovery_event_usuario_id_created_em_idx"
  ON "discovery_event"("usuario_id", "created_em");

-- FKs (cascade acompanha o ciclo de vida da mídia/usuário).
ALTER TABLE "discovery_event"
  ADD CONSTRAINT "discovery_event_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "discovery_event_from_media_id_fkey"
    FOREIGN KEY ("from_media_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "discovery_event_to_media_id_fkey"
    FOREIGN KEY ("to_media_id") REFERENCES "midia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
