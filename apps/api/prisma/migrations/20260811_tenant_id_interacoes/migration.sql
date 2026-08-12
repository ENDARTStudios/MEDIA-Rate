-- T234/T301: usuario_midia_interacao precisa de tenant_id para as policies RLS
-- (interacao_tenant_user/interacao_read_admin). Coluna aditiva + idempotente.

ALTER TABLE "usuario_midia_interacao"
  ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
