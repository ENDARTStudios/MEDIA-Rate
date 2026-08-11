-- T292 (Arquitetura §7): feature flags leves em tabela. ADITIVA; DB virgem ok.
-- Sem serviço externo agora (GrowthBook/Unleash) — decisão registrada em
-- DECISOES; reavaliar ferramenta self-host quando houver >10 flags.

CREATE TABLE "feature_flags" (
  "key" VARCHAR(64) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "rollout_percent" INTEGER NOT NULL DEFAULT 100,
  "plan_gate" VARCHAR(16),
  "tenant_overrides" JSONB DEFAULT '{}',
  "updated_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" UUID,
  CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);
