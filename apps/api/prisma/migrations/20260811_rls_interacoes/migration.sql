-- T301 (D-287): RLS em usuario_midia_interacao — owner-only + exceção FOR
-- SELECT para ADMIN (caminho agregado do colaborativo). Mesmo padrão T299.
-- Rollback: docs/ROLLBACK_RLS.md (DROP POLICY + DISABLE).

ALTER TABLE "usuario_midia_interacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuario_midia_interacao" FORCE ROW LEVEL SECURITY;

CREATE POLICY "interacao_tenant_user" ON "usuario_midia_interacao"
  USING (
    "tenant_id" = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    AND "usuario_id" = COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WITH CHECK (
    "tenant_id" = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    AND "usuario_id" = COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE POLICY "interacao_read_admin" ON "usuario_midia_interacao"
  FOR SELECT
  USING (
    "tenant_id" = COALESCE(current_setting('app.current_tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
    AND current_setting('app.current_user_role', true) = 'ADMIN'
  );
